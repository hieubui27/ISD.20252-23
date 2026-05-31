import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingFeeService } from '../shared/utils/shipping-fee.service';
import { MailService } from '../mail/mail.service';
import { getOrderConfirmationEmailTemplate } from '../mail/templates/order-confirmation.template';
import { PaymentService } from '../payment/payment.service';
import { DeliveryInfoValidator } from '../shared/utils/validators/delivery-info.validator';
import { CartItemDto } from './dto/cart-item.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { DeliveryInfoDto } from './dto/delivery-info.dto';
import { InvoiceItemDto, InvoicePreviewDto } from './dto/invoice-preview.dto';
import { OrderSuccessDto } from './dto/order-success.dto';
import { PlaceOrderPaymentRequestDto } from './dto/place-order-payment-request.dto';
import { PlaceOrderPaymentResultDto } from './dto/place-order-payment-result.dto';
import { PlaceOrderRequestDto } from './dto/place-order-request.dto';
import {
  InsufficientItemDto,
  StockCheckResultDto,
} from './dto/stock-check-result.dto';
import { SubmitDeliveryInfoDto } from './dto/submit-delivery-info.dto';
import {
  DELIVERY_METHOD_STANDARD,
  ORDER_STATUS_PENDING_PAYMENT,
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

/**
 * ============================================================
 * SOLID VIOLATIONS IN PlaceOrderBeService
 * ============================================================
 *
 * [SRP VIOLATION] – Single Responsibility Principle
 * This service bears at least 7 distinct responsibilities:
 *   1. Cart item normalization and input validation (normalizeItems)
 *   2. Delivery info validation (validateDeliveryInfo)
 *   3. Payment info validation (validatePaymentInfo)
 *   4. Stock availability checking (checkStock, checkStockFromProducts)
 *   5. Invoice & VAT calculation (buildInvoicePreviewFromProducts)
 *   6. Order persistence – creating Order, Invoice, OrderProduct, Transaction
 *      records and decrementing stock (createPayment, confirmOrder)
 *   7. Email notification (sendOrderConfirmationEmail)
 *
 * Impact: Any change to the email template, VAT rate, validation rules,
 * persistence schema, or payment flow forces a modification of this class,
 * increasing the risk of regressions across unrelated workflows.
 *
 * Improvement direction:
 *   - Extract an OrderValidationService that owns cart normalization,
 *     delivery validation, and payment info validation.
 *   - Extract an InvoiceCalculationService that owns VAT/shipping fee logic.
 *   - Extract an OrderPersistenceService (or repository) for all DB writes.
 *   - Move email sending behind an event/observer so PlaceOrderBeService
 *     only emits an "OrderConfirmed" event and does not own notification logic.
 *   - Keep PlaceOrderBeService as a thin orchestrator that delegates to the above.
 *
 * ============================================================
 *
 * [DIP VIOLATION] – Dependency Inversion Principle
 * PlaceOrderBeService directly depends on two concrete classes:
 *   - ShippingFeeService (no interface; any alternative strategy requires
 *     changing this class's constructor and call sites).
 *   - MailService (no interface; switching to SMS/Zalo notification requires
 *     modifying this class).
 *
 * Impact: High-level business logic (order placement) is tightly coupled to
 * low-level infrastructure (a specific shipping calculation and a specific
 * notification channel). This makes the class hard to test in isolation and
 * hard to extend.
 *
 * Improvement direction:
 *   - Introduce IShippingFeeCalculator interface; inject it instead of
 *     ShippingFeeService. ShippingFeeService implements the interface.
 *   - Introduce INotificationService interface; inject it instead of
 *     MailService. EmailNotificationService implements the interface.
 * ============================================================
 */
@Injectable()
export class PlaceOrderBeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingFeeService: ShippingFeeService,
    private readonly mailService: MailService,
    @Optional()
    private readonly paymentService?: PaymentService,
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

  async createPayment(
    dto: PlaceOrderPaymentRequestDto,
  ): Promise<PlaceOrderPaymentResultDto> {
    if (!this.paymentService) {
      throw new BadRequestException('Payment service is not configured');
    }

    this.validateDeliveryInfo(dto.deliveryInfo, true);

    const pendingOrder = await this.prisma.$transaction(
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
            status: ORDER_STATUS_PENDING_PAYMENT,
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

        return {
          orderId: order.orderId,
          invoiceId: invoice.id.toString(),
          totalAmount: Math.round(invoicePreview.totalAmount),
        };
      },
    );

    const paymentResult = await this.paymentService.requestPayment({
      orderId: pendingOrder.orderId,
      invoiceId: pendingOrder.invoiceId,
      paymentMethod: dto.paymentMethod,
      amount: pendingOrder.totalAmount,
      customerEmail: this.getRequiredEmail(dto.deliveryInfo),
    });

    return {
      orderId: pendingOrder.orderId,
      invoiceId: pendingOrder.invoiceId,
      totalAmount: pendingOrder.totalAmount,
      paymentMethod: paymentResult.paymentMethod,
      paymentStatus: paymentResult.status,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      paymentTransactionId: paymentResult.transactionId,
      message: paymentResult.message,
    };
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
            invoiceId: invoice.id,
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
    // [DIP VIOLATION] PlaceOrderBeService calls DeliveryInfoValidator as a static
    // concrete class — not injectable, not mockable, not swappable.
    // Fix: make DeliveryInfoValidator an @Injectable() class behind an
    // IDeliveryInfoValidator interface and inject it via the constructor.
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
      const weightKg = this.normalizeProductWeightKg(product.weight);

      return {
        productId: item.productId,
        title: product.title,
        price,
        quantity: item.quantity,
        amount: price * item.quantity,
        weight: weightKg,
      };
    });
    const subtotalBeforeVat = invoiceItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalWeight = items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      return sum + this.normalizeProductWeightKg(product.weight) * item.quantity;
    }, 0);
    const vatAmount = subtotalBeforeVat * VAT_RATE;
    const subtotalAfterVat = subtotalBeforeVat + vatAmount;
    const shippingBreakdown =
      this.shippingFeeService.calculateShippingFeeBreakdown(
        deliveryInfo.province,
        totalWeight,
        subtotalBeforeVat,
      );
    const deliveryFee = shippingBreakdown.finalShippingFee;

    this.debugInvoiceCalculation({
      productTotalExVat: subtotalBeforeVat,
      vatAmount,
      productTotalInclVat: subtotalAfterVat,
      totalWeight,
      shippingFeeBeforeDiscount: shippingBreakdown.shippingFeeBeforeDiscount,
      shippingDiscount: shippingBreakdown.shippingDiscount,
      finalShippingFee: deliveryFee,
      totalAmount: subtotalAfterVat + deliveryFee,
      province: deliveryInfo.province,
    });

    return {
      items: invoiceItems,
      subtotalBeforeVat,
      vatAmount,
      subtotalAfterVat,
      deliveryFee,
      totalAmount: subtotalAfterVat + deliveryFee,
    };
  }

  private normalizeProductWeightKg(weight: unknown): number {
    const weightInGrams = Number(weight);

    if (!Number.isFinite(weightInGrams) || weightInGrams <= 0) {
      return 0;
    }

    return weightInGrams / 1000;
  }

  private debugInvoiceCalculation(values: Record<string, unknown>): void {
    if (process.env.DEBUG_PLACE_ORDER_AMOUNT !== '1') {
      return;
    }

    console.debug('[PlaceOrder] invoice calculation', values);
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

  // [OCP VIOLATION] Notification channel is hardcoded to email only.
  // Future requirements (SMS, Zalo, push notifications) would require
  // modifying this method and adding new MailService-like dependencies —
  // violating the "closed for modification" rule.
  // Fix: introduce INotificationService { notify(recipient, content) } and
  // inject it. Add new channels by implementing the interface, not by
  // changing PlaceOrderBeService.
  private async sendOrderConfirmationEmail(
    successDto: OrderSuccessDto,
    invoicePreview: InvoicePreviewDto,
    email?: string,
  ): Promise<void> {
    if (!email) return;

    const html = getOrderConfirmationEmailTemplate(successDto, invoicePreview);

    await this.mailService.sendMail({
      recipientEmail: [email],
      subject: `[AIMS] Xác nhận đơn hàng - Giao dịch ${successDto.transactionId}`,
      html,
    });
  }
}
