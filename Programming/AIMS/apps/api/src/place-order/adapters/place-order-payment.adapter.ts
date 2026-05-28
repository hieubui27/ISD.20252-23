import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { getOrderConfirmationEmailTemplate } from '../../mail/templates/order-confirmation.template';
import { PaymentStatus } from '../../payment/constants/payment.constants';
import {
  PaidOrderContext,
  PaymentContext,
  PaymentContextLookup,
  PlaceOrderPaymentPort,
} from '../../payment/ports/place-order-payment.port';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../constants/place-order.constants';
import { InvoicePreviewDto, InvoiceItemDto } from '../dto/invoice-preview.dto';
import { OrderSuccessDto } from '../dto/order-success.dto';

type PrismaClientLike = {
  [key: string]: any;
};

@Injectable()
export class PlaceOrderPaymentAdapter implements PlaceOrderPaymentPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getPaymentContext(
    lookup: PaymentContextLookup,
  ): Promise<PaymentContext> {
    const order = await this.prisma.order.findUnique({
      where: { orderId: lookup.orderId },
      include: { invoice: true },
    });

    if (!order || !order.invoice) {
      throw new NotFoundException('Order payment context not found');
    }

    const invoiceId = order.invoice.id.toString();
    if (lookup.invoiceId !== invoiceId) {
      throw new BadRequestException('Invoice does not belong to order');
    }

    return {
      orderId: order.orderId,
      invoiceId,
      totalAmount: Math.round(Number(order.invoice.totalAmount)),
      customerEmail: order.email,
    };
  }

  async markPaidAndPendingProcessing(context: PaidOrderContext): Promise<void> {
    const completed = await this.prisma.$transaction(
      async (tx: PrismaClientLike) => {
        const order = await tx.order.findUnique({
          where: { orderId: context.orderId },
          include: {
            invoice: true,
            orderProducts: {
              include: { product: true },
            },
          },
        });

        if (!order || !order.invoice) {
          throw new NotFoundException('Order payment context not found');
        }

        if (order.invoice.id.toString() !== context.invoiceId) {
          throw new BadRequestException('Invoice does not belong to order');
        }

        if (Math.round(Number(order.invoice.totalAmount)) !== context.amount) {
          throw new BadRequestException('Amount mismatch');
        }

        if (order.status === ORDER_STATUS_PENDING_PROCESSING) {
          return order;
        }

        if (order.status !== ORDER_STATUS_PENDING_PAYMENT) {
          throw new BadRequestException(
            `Cannot mark order paid from ${order.status}`,
          );
        }

        for (const orderProduct of order.orderProducts) {
          const decrementResult = await tx.product.updateMany({
            where: {
              id: orderProduct.productId,
              quantity: { gte: orderProduct.quantity },
            },
            data: {
              quantity: { decrement: orderProduct.quantity },
            },
          });

          if (decrementResult.count === 0) {
            throw new BadRequestException(
              `Insufficient stock for product ${orderProduct.productId}`,
            );
          }
        }

        await tx.transaction.create({
          data: {
            amount: context.amount,
            content: context.transactionContent || context.transactionId,
            method: context.paymentMethod,
            status: PaymentStatus.SUCCESS,
            invoiceId: order.invoice.id,
          },
        });

        return tx.order.update({
          where: { orderId: context.orderId },
          data: {
            status: ORDER_STATUS_PENDING_PROCESSING,
            updatedAt: new Date(),
          },
          include: {
            invoice: true,
            orderProducts: {
              include: { product: true },
            },
          },
        });
      },
    );

    this.sendOrderConfirmationEmail(completed, context).catch((error) =>
      console.error('Failed to send order confirmation email:', error),
    );
  }

  private async sendOrderConfirmationEmail(
    order: any,
    context: PaidOrderContext,
  ): Promise<void> {
    if (!order.email || !order.invoice) {
      return;
    }

    const successDto: OrderSuccessDto = {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      province: order.province,
      streetAddress: order.streetAddress,
      totalAmount: Number(order.invoice.totalAmount),
      transactionId: context.transactionId,
      transactionContent: context.transactionContent || context.transactionId,
      transactionDate: context.transactionDateTime || new Date(),
    };
    const invoicePreview = this.buildInvoicePreview(order);

    await this.mailService.sendMail({
      recipientEmail: [order.email],
      subject: `[AIMS] Xac nhan don hang - Giao dich ${successDto.transactionId}`,
      html: getOrderConfirmationEmailTemplate(successDto, invoicePreview),
    });
  }

  private buildInvoicePreview(order: any): InvoicePreviewDto {
    const items: InvoiceItemDto[] = order.orderProducts.map(
      (orderProduct: any) => ({
        productId: Number(orderProduct.productId),
        title: orderProduct.product?.title,
        price: Number(orderProduct.price),
        quantity: orderProduct.quantity,
        amount: Number(orderProduct.price) * orderProduct.quantity,
        weight: orderProduct.product?.weight
          ? Number(orderProduct.product.weight)
          : undefined,
      }),
    );
    const subtotalBeforeVat = Number(order.subtotal);
    const subtotalAfterVat = Number(order.invoice.vatSubtotal);

    return {
      items,
      subtotalBeforeVat,
      vatAmount: subtotalAfterVat - subtotalBeforeVat,
      subtotalAfterVat,
      deliveryFee: Number(order.deliveryFee),
      totalAmount: Number(order.invoice.totalAmount),
    };
  }
}
