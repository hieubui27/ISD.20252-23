import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingFeeService } from '../order/shipping-fee.service';
import { MailService } from '../mail/mail.service';
import { DeliveryInfoValidator } from '../order/validators/delivery-info.validator';
import { CartItemDto } from './dto/cart-item.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { DeliveryInfoDto } from './dto/delivery-info.dto';
import { InvoiceItemDto, InvoicePreviewDto } from './dto/invoice-preview.dto';
import { OrderSuccessDto } from './dto/order-success.dto';
import { PlaceOrderRequestDto } from './dto/place-order-request.dto';
import {
  InsufficientItemDto,
  StockCheckResultDto,
} from './dto/stock-check-result.dto';
import { SubmitDeliveryInfoDto } from './dto/submit-delivery-info.dto';
import {
  DELIVERY_METHOD_STANDARD,
  ORDER_STATUS_PENDING_PROCESSING,
  PAYMENT_STATUS_SUCCESS,
  PAYMENT_TRANSACTION_PROVIDER_PLACE_ORDER,
  UNAVAILABLE_PRODUCT_STATUSES,
  VAT_RATE,
} from './constants/place-order.constants';
import { InvalidDeliveryInfoException } from './exceptions/invalid-delivery-info.exception';
import { InvalidQuantityException } from './exceptions/invalid-quantity.exception';
import { PaymentNotSuccessfulException } from './exceptions/payment-not-successful.exception';

type PrismaClientLike = {
  [key: string]: any;
};

@Injectable()
export class PlaceOrderBeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingFeeService: ShippingFeeService,
    private readonly mailService: MailService,
  ) {}

  async checkStock(dto: PlaceOrderRequestDto): Promise<StockCheckResultDto> {
    const items = this.normalizeItems(dto.items);
    const products = await this.findProductsByIds(
      items.map((item) => item.productId),
      this.prisma,
    );

    return this.checkStockFromProducts(items, products);
  }

  async processDeliveryInfo(
    dto: SubmitDeliveryInfoDto,
  ): Promise<InvoicePreviewDto> {
    this.validateDeliveryInfo(dto.deliveryInfo);

    const items = this.normalizeItems(dto.items);
    const products = await this.findProductsByIds(
      items.map((item) => item.productId),
      this.prisma,
    );

    const stockResult = this.checkStockFromProducts(items, products);
    if (!stockResult.sufficient) {
      throw new InvalidQuantityException(stockResult.insufficientItems);
    }

    return this.buildInvoicePreviewFromProducts(
      items,
      products,
      dto.deliveryInfo,
    );
  }

  async confirmOrder(dto: ConfirmOrderDto): Promise<OrderSuccessDto> {
    this.validateDeliveryInfo(dto.deliveryInfo, true);
    this.validatePaymentInfo(dto);

    const existingPaymentTransaction =
      await this.prisma.paymentTransaction.findUnique({
        where: { transactionId: dto.transactionId },
      });

    if (existingPaymentTransaction) {
      return this.mapExistingPaymentTransactionToSuccessDto(
        existingPaymentTransaction,
      );
    }

    let capturedInvoicePreview: InvoicePreviewDto | null = null;

    const successDto = await this.prisma.$transaction(
      async (tx: PrismaClientLike) => {
        const items = this.normalizeItems(dto.items);
        const products = await this.findProductsByIds(
          items.map((item) => item.productId),
          tx,
        );
        const stockResult = this.checkStockFromProducts(items, products);

        if (!stockResult.sufficient) {
          throw new InvalidQuantityException(stockResult.insufficientItems);
        }

        const invoicePreview = this.buildInvoicePreviewFromProducts(
          items,
          products,
          dto.deliveryInfo,
        );
        capturedInvoicePreview = invoicePreview;
        const orderCode = this.generateOrderCode();

        const order = await tx.order.create({
          data: {
            orderId: orderCode,
            customerName: dto.deliveryInfo.receiverName.trim(),
            phoneNumber: dto.deliveryInfo.phoneNumber,
            email: this.getRequiredEmail(dto.deliveryInfo),
            streetAddress: dto.deliveryInfo.streetAddress.trim(),
            province: dto.deliveryInfo.province.trim(),
            deliveryMethod: DELIVERY_METHOD_STANDARD,
            deliveryFee: invoicePreview.deliveryFee,
            subtotal: invoicePreview.subtotalBeforeVat,
            status: ORDER_STATUS_PENDING_PROCESSING,
          },
        });

        await tx.orderProduct.createMany({
          data: invoicePreview.items.map((invoiceItem) => ({
            orderId: order.id,
            productId: BigInt(invoiceItem.productId),
            quantity: invoiceItem.quantity,
            price: invoiceItem.price,
          })),
        });

        const invoice = await tx.invoice.create({
          data: {
            orderId: order.id,
            vatSubtotal: invoicePreview.subtotalAfterVat,
            totalAmount: invoicePreview.totalAmount,
          },
        });

        await tx.transaction.create({
          data: {
            amount: invoicePreview.totalAmount,
            content: dto.transactionContent || dto.transactionId,
            method: dto.paymentMethod,
            status: PAYMENT_STATUS_SUCCESS,
            invoiceId: invoice.id,
          },
        });

        for (const item of items) {
          const decrementResult = await tx.product.updateMany({
            where: {
              id: BigInt(item.productId),
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          if (decrementResult.count === 0) {
            const latestProduct = await tx.product.findUnique({
              where: { id: BigInt(item.productId) },
            });

            throw new InvalidQuantityException([
              {
                productId: item.productId,
                requested: item.quantity,
                available: latestProduct?.quantity ?? 0,
              },
            ]);
          }
        }

        const transactionDate = dto.transactionDate
          ? new Date(dto.transactionDate)
          : new Date();

        await tx.paymentTransaction.create({
          data: {
            orderId: order.orderId,
            invoiceId: invoice.id.toString(),
            paymentMethod: dto.paymentMethod,
            provider: PAYMENT_TRANSACTION_PROVIDER_PLACE_ORDER,
            amount: Math.round(invoicePreview.totalAmount),
            status: PAYMENT_STATUS_SUCCESS,
            transactionId: dto.transactionId,
            transactionContent: dto.transactionContent || dto.transactionId,
            transactionDateTime: transactionDate,
          },
        });

        return this.mapToOrderSuccessDto(
          dto.deliveryInfo,
          invoicePreview.totalAmount,
          dto.transactionId,
          dto.transactionContent || dto.transactionId,
          transactionDate,
        );
      },
    );

    if (capturedInvoicePreview) {
      this.sendOrderConfirmationEmail(
        successDto,
        capturedInvoicePreview,
        dto.deliveryInfo.email,
      ).catch((err: unknown) =>
        console.error('Failed to send order confirmation email:', err),
      );
    }

    return successDto;
  }

  private async mapExistingPaymentTransactionToSuccessDto(
    paymentTransaction: any,
  ): Promise<OrderSuccessDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderId: paymentTransaction.orderId },
      include: { invoice: true },
    });

    if (!order || !order.invoice) {
      throw new BadRequestException(
        'Existing transaction cannot be mapped to an order.',
      );
    }

    return {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      province: order.province,
      streetAddress: order.streetAddress,
      totalAmount: Number(order.invoice.totalAmount),
      transactionId: paymentTransaction.transactionId,
      transactionContent:
        paymentTransaction.transactionContent ||
        paymentTransaction.transactionId,
      transactionDate:
        paymentTransaction.transactionDateTime || paymentTransaction.createdAt,
    };
  }

  private validateDeliveryInfo(
    deliveryInfo: DeliveryInfoDto,
    requireEmail = false,
  ): void {
    const validationResult = DeliveryInfoValidator.validate(deliveryInfo);
    const errors = [...validationResult.errors];

    if (
      requireEmail &&
      (!deliveryInfo?.email || deliveryInfo.email.trim().length === 0)
    ) {
      errors.push('Email is required to create order.');
    }

    if (errors.length > 0) {
      throw new InvalidDeliveryInfoException(errors);
    }
  }

  private validatePaymentInfo(dto: ConfirmOrderDto): void {
    if (!dto.transactionId || dto.transactionId.trim().length === 0) {
      throw new PaymentNotSuccessfulException(
        'Payment transaction id is missing.',
      );
    }

    if (!dto.paymentMethod || dto.paymentMethod.trim().length === 0) {
      throw new PaymentNotSuccessfulException('Payment method is missing.');
    }
  }

  private normalizeItems(items: CartItemDto[]): CartItemDto[] {
    if (!items || items.length === 0) {
      throw new BadRequestException('Items array must not be empty.');
    }

    const mergedItems = new Map<number, CartItemDto>();

    for (const item of items) {
      if (!item.productId) {
        throw new BadRequestException('Product id is required.');
      }

      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new BadRequestException('Product id must be a positive integer.');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Quantity must be a positive integer.');
      }

      const existing = mergedItems.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        mergedItems.set(item.productId, {
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    return Array.from(mergedItems.values());
  }

  private async findProductsByIds(
    productIds: number[],
    client: PrismaClientLike,
  ): Promise<any[]> {
    return client.product.findMany({
      where: {
        id: { in: productIds.map((productId) => BigInt(productId)) },
      },
    });
  }

  private checkStockFromProducts(
    items: CartItemDto[],
    products: any[],
  ): StockCheckResultDto {
    const productsById = new Map<number, any>(
      products.map((product) => [Number(product.id), product]),
    );
    const insufficientItems: InsufficientItemDto[] = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      const available =
        product && this.isProductAvailable(product) ? product.quantity : 0;

      if (available < item.quantity) {
        insufficientItems.push({
          productId: item.productId,
          requested: item.quantity,
          available,
        });
      }
    }

    return {
      sufficient: insufficientItems.length === 0,
      insufficientItems,
    };
  }

  private buildInvoicePreviewFromProducts(
    items: CartItemDto[],
    products: any[],
    deliveryInfo: DeliveryInfoDto,
  ): InvoicePreviewDto {
    const productsById = new Map<number, any>(
      products.map((product) => [Number(product.id), product]),
    );
    const invoiceItems: InvoiceItemDto[] = items.map((item) => {
      const product = productsById.get(item.productId);
      const price = Number(product.currentPrice);

      return {
        productId: item.productId,
        title: product.title,
        price,
        quantity: item.quantity,
        amount: price * item.quantity,
        weight: Number(product.weight),
      };
    });
    const subtotalBeforeVat = invoiceItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalWeight = items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      return sum + Number(product.weight) * item.quantity;
    }, 0);
    const vatAmount = subtotalBeforeVat * VAT_RATE;
    const subtotalAfterVat = subtotalBeforeVat + vatAmount;
    const deliveryFee = this.shippingFeeService.calculateShippingFee(
      deliveryInfo.province,
      totalWeight,
      subtotalBeforeVat,
    );

    return {
      items: invoiceItems,
      subtotalBeforeVat,
      vatAmount,
      subtotalAfterVat,
      deliveryFee,
      totalAmount: subtotalAfterVat + deliveryFee,
    };
  }

  private isProductAvailable(product: any): boolean {
    return !UNAVAILABLE_PRODUCT_STATUSES.includes(
      String(product.status).toUpperCase(),
    );
  }

  private getRequiredEmail(deliveryInfo: DeliveryInfoDto): string {
    if (!deliveryInfo.email || deliveryInfo.email.trim().length === 0) {
      throw new InvalidDeliveryInfoException([
        'Email is required to create order.',
      ]);
    }

    return deliveryInfo.email.trim();
  }

  private generateOrderCode(): string {
    return `PO-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  private mapToOrderSuccessDto(
    deliveryInfo: DeliveryInfoDto,
    totalAmount: number,
    transactionId: string,
    transactionContent: string,
    transactionDate: Date,
  ): OrderSuccessDto {
    return {
      customerName: deliveryInfo.receiverName.trim(),
      phoneNumber: deliveryInfo.phoneNumber,
      province: deliveryInfo.province.trim(),
      streetAddress: deliveryInfo.streetAddress.trim(),
      totalAmount,
      transactionId,
      transactionContent,
      transactionDate,
    };
  }

  private async sendOrderConfirmationEmail(
    successDto: OrderSuccessDto,
    invoicePreview: InvoicePreviewDto,
    email?: string,
  ): Promise<void> {
    if (!email) return;

    const itemRows = invoicePreview.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:6px 8px;border:1px solid #ddd">${item.title ?? item.productId}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${item.price.toLocaleString('vi-VN')} VND</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${item.amount.toLocaleString('vi-VN')} VND</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333">
        <h2 style="color:#1a73e8">Xác nhận đơn hàng AIMS</h2>
        <p>Xin chào <strong>${successDto.customerName}</strong>,</p>
        <p>Đơn hàng của bạn đã được đặt thành công. Dưới đây là thông tin chi tiết:</p>

        <h3>Thông tin giao hàng</h3>
        <p>
          Địa chỉ: ${successDto.streetAddress}, ${successDto.province}<br/>
          Số điện thoại: ${successDto.phoneNumber}
        </p>

        <h3>Danh sách sản phẩm</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Sản phẩm</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center">SL</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Đơn giá</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table style="margin-top:12px;font-size:14px;margin-left:auto">
          <tr>
            <td style="padding:4px 12px">Tạm tính (chưa VAT):</td>
            <td style="padding:4px 12px;text-align:right">${invoicePreview.subtotalBeforeVat.toLocaleString('vi-VN')} VND</td>
          </tr>
          <tr>
            <td style="padding:4px 12px">VAT (10%):</td>
            <td style="padding:4px 12px;text-align:right">${invoicePreview.vatAmount.toLocaleString('vi-VN')} VND</td>
          </tr>
          <tr>
            <td style="padding:4px 12px">Phí vận chuyển:</td>
            <td style="padding:4px 12px;text-align:right">${invoicePreview.deliveryFee.toLocaleString('vi-VN')} VND</td>
          </tr>
          <tr style="font-weight:bold;font-size:15px">
            <td style="padding:8px 12px;border-top:2px solid #333">Tổng thanh toán:</td>
            <td style="padding:8px 12px;border-top:2px solid #333;text-align:right">${successDto.totalAmount.toLocaleString('vi-VN')} VND</td>
          </tr>
        </table>

        <h3>Thông tin giao dịch</h3>
        <p>
          Mã giao dịch: <strong>${successDto.transactionId}</strong><br/>
          Nội dung: ${successDto.transactionContent}<br/>
          Thời gian: ${successDto.transactionDate.toLocaleString('vi-VN')}
        </p>

        <p style="color:#666;font-size:13px">
          Đơn hàng đang chờ xác nhận từ nhân viên AIMS. Chúng tôi sẽ thông báo khi đơn hàng được duyệt.
        </p>
      </div>
    `;

    await this.mailService.sendMail({
      recipientEmail: [email],
      subject: `[AIMS] Xác nhận đơn hàng - Giao dịch ${successDto.transactionId}`,
      html,
    });
  }
}
