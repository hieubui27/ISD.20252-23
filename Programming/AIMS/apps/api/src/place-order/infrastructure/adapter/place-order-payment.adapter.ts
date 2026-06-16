import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaidOrderContext,
  PaymentContext,
  PaymentContextLookup,
  PlaceOrderPaymentPort,
} from '../../../payment/ports/place-order-payment.port';
import { OrderSuccessDto } from '../../dto/order-success.dto';
import {
  IOrderEventPublisher,
  ORDER_EVENT_PUBLISHER,
} from '../../domain/ports/notification.port';
import {
  IOrderRepository,
  ORDER_REPOSITORY,
  PersistedOrderDetail,
} from '../../domain/ports/order-repository.port';
import { InvoiceCalculator } from '../../domain/services/invoice-calculator.service';
import { OrderStateFactory } from '../../domain/states/order-state.factory';

/**
 * Adapter that lets the payment module drive the order domain (Ports & Adapters).
 *
 * After refactor it is a thin bridge: persistence is delegated to the
 * repository, the legal status transition is decided by the State pattern, and
 * the confirmation e-mail is emitted through the Observer publisher. It no
 * longer touches Prisma or MailService directly => SRP, low coupling.
 */
@Injectable()
export class PlaceOrderPaymentAdapter implements PlaceOrderPaymentPort {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly repository: IOrderRepository,
    private readonly orderStateFactory: OrderStateFactory,
    private readonly invoiceCalculator: InvoiceCalculator,
    @Inject(ORDER_EVENT_PUBLISHER)
    private readonly eventPublisher: IOrderEventPublisher,
  ) {}

  async getPaymentContext(
    lookup: PaymentContextLookup,
  ): Promise<PaymentContext> {
    const order = await this.repository.findOrderDetailByOrderId(
      lookup.orderId,
    );

    if (!order || !order.invoice) {
      throw new NotFoundException('Order payment context not found');
    }

    if (lookup.invoiceId !== order.invoice.id) {
      throw new BadRequestException('Invoice does not belong to order');
    }

    return {
      orderId: order.orderId,
      invoiceId: order.invoice.id,
      totalAmount: Math.round(order.invoice.totalAmount),
      customerEmail: order.email,
    };
  }

  async markPaidAndPendingProcessing(context: PaidOrderContext): Promise<void> {
    const order = await this.repository.findOrderDetailByOrderId(
      context.orderId,
    );

    if (!order || !order.invoice) {
      throw new NotFoundException('Order payment context not found');
    }

    if (order.invoice.id !== context.invoiceId) {
      throw new BadRequestException('Invoice does not belong to order');
    }

    if (Math.round(order.invoice.totalAmount) !== context.amount) {
      throw new BadRequestException('Amount mismatch');
    }

    // State pattern: decide whether the transition is legal / a no-op.
    const transition = this.orderStateFactory
      .create(order.status)
      .confirmPayment();

    const finalOrder = transition.alreadyInTarget
      ? order
      : await this.repository.applyPaidTransition(context.orderId);

    await this.notifyOrderConfirmed(finalOrder, context);
  }

  private async notifyOrderConfirmed(
    order: PersistedOrderDetail,
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
      totalAmount: order.invoice.totalAmount,
      transactionId: context.transactionId,
      transactionContent: context.transactionContent || context.transactionId,
      transactionDate: context.transactionDateTime || new Date(),
    };

    await this.eventPublisher.publish({
      recipientEmail: order.email,
      order: successDto,
      invoice: this.invoiceCalculator.buildFromPersistedOrder(order),
    });
  }
}
