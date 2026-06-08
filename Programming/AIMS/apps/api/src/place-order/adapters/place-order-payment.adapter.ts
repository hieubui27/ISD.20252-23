import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { getOrderConfirmationEmailTemplate } from '../../mail/templates/order-confirmation.template';
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

/**
 * ============================================================
 * SOLID VIOLATIONS IN PlaceOrderPaymentAdapter
 * ============================================================
 *
 * [SRP VIOLATION] – Single Responsibility Principle
 * This adapter bundles at least 4 distinct responsibilities:
 *   1. Payment context lookup – querying DB to return PaymentContext
 *      (getPaymentContext).
 *   2. Order status management – transitioning order from PENDING_PAYMENT
 *      to PENDING_PROCESSING (markPaidAndPendingProcessing).
 *   3. Inventory management – decrementing product stock quantities inside
 *      the same transaction (markPaidAndPendingProcessing).
 *   4. Email notification – building the invoice preview and sending the
 *      order-confirmation email (sendOrderConfirmationEmail, buildInvoicePreview).
 *
 * Impact: A change to the email template, a new stock-decrement rule, or
 * a change in how the order status machine works all force modifications
 * to this single class. Notification logic mixed with persistence makes
 * isolated unit testing difficult.
 *
 * Improvement direction:
 *   - Extract an OrderStatusService that owns the status transition and
 *     stock decrement transaction.
 *   - Move sendOrderConfirmationEmail and buildInvoicePreview into a
 *     dedicated OrderNotificationService (or emit an event and let a
 *     notification handler consume it).
 *   - Keep PlaceOrderPaymentAdapter thin: only bridge payment callbacks
 *     to the order domain without owning notification.
 *
 * ============================================================
 *
 * [LSP CONCERN] – Liskov Substitution Principle
 * PlaceOrderPaymentPort declares markPaidAndPendingProcessing(): Promise<void>.
 * This adapter's implementation triggers significant observable side effects:
 *   - Stock decrement across all ordered products
 *   - Order status DB update
 *   - Order confirmation email sent to the customer
 *
 * Improvement direction:
 *   - Strengthen the interface contract by documenting the expected post-conditions
 *     of markPaidAndPendingProcessing (order marked as paid, stock decremented).
 *   - Extract the notification side-effect out of the interface boundary.
 * ============================================================
 */
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
