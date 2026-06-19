import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from './constants/payment.constants';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { CustomerRefundRequestDto } from './dto/customer-refund-request.dto';
import { PaymentResultDto } from './dto/payment-result.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import {
  PLACE_ORDER_PAYMENT_PORT,
  PlaceOrderPaymentPort,
} from './ports/place-order-payment.port';
import { ensureCanMarkRefundRequired } from './helpers/payment-transaction-status.helper';
import { PaymentGatewayFactory } from './strategies/payment-gateway.factory';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentCompletionService } from './payment-completion.service';
import { PaymentGatewayTransactionRefResolver } from './payment-gateway-transaction-ref.resolver';
import { PaypalStaleTransactionCleanupService } from './paypal-stale-transaction-cleanup.service';
import { PaymentGatewayOrderIdService } from './payment-gateway-order-id.service';

/** Order is only customer-cancellable while it is awaiting manager approval. */
const ORDER_STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
const ORDER_STATUS_PENDING_PROCESSING = 'PENDING_PROCESSING';
const ORDER_STATUS_CANCELLED = 'CANCELLED_BY_CUSTOMER';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service coordinates payment through PaymentGatewayFactory, PrismaService, and PlaceOrderPaymentPort.
 * - It does not handle provider inbound callbacks; provider-specific modules own those flows.
 *
 * Cohesion reason:
 * - All public methods serve the payment transaction lifecycle: request, method change, confirmation,
 *   status update, lookup, and refund-required marking.
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly paymentCompletionService: PaymentCompletionService,
    private readonly transactionRefResolver: PaymentGatewayTransactionRefResolver,
    private readonly paypalStaleTransactionCleanup: PaypalStaleTransactionCleanupService,
    private readonly gatewayOrderIdService: PaymentGatewayOrderIdService,
    @Inject(PLACE_ORDER_PAYMENT_PORT)
    private readonly placeOrderPaymentPort: PlaceOrderPaymentPort,
  ) {}

  async requestPayment(dto: RequestPaymentDto): Promise<PaymentResultDto> {
    await this.paypalStaleTransactionCleanup.expireStaleTransactions();

    const paymentMethod = dto.paymentMethod || PaymentMethod.VIETQR;
    const gateway = this.gatewayFactory.getCreationGateway(paymentMethod);
    const invoiceId = this.parseInvoiceId(dto.invoiceId);

    const paymentContext = await this.placeOrderPaymentPort.getPaymentContext({
      orderId: dto.orderId,
      invoiceId: dto.invoiceId,
      amount: dto.amount,
      customerEmail: dto.customerEmail,
    });

    if (dto.amount !== paymentContext.totalAmount) {
      throw new BadRequestException('Amount mismatch');
    }

    const transaction =
      await this.paymentTransactionService.getOrCreatePendingTransaction({
        orderId: dto.orderId,
        invoiceId,
        paymentMethod,
        amount: dto.amount,
      });
    await this.paymentTransactionService.cancelOtherPendingByOrder(
      transaction.orderId,
      transaction.id,
    );
    const gatewayOrderId =
      await this.gatewayOrderIdService.ensureForCreatePayment(
        paymentMethod,
        transaction,
      );

    let gatewayResult: Awaited<ReturnType<typeof gateway.createPayment>>;
    try {
      gatewayResult = await gateway.createPayment({
        gatewayOrderId,
        amount: dto.amount,
        description: `AIMS ${gatewayOrderId}`,
        customerEmail: dto.customerEmail,
        invoiceId: dto.invoiceId,
      });
    } catch (err) {
      await this.paymentTransactionService.markFailed(transaction.id);
      throw err;
    }

    const providerUpdate = gatewayResult.transactionUpdate || {};

    if (
      paymentMethod === PaymentMethod.PAYPAL &&
      !providerUpdate.gatewayOrderId
    ) {
      await this.paymentTransactionService.markFailed(transaction.id);
      throw new BadRequestException(
        'PayPal order id was not returned by PayPal',
      );
    }

    if (Object.keys(providerUpdate).length > 0) {
      await this.paymentTransactionService.updateProviderData(
        transaction.id,
        providerUpdate,
      );
    }

    return {
      success: true,
      status: PaymentStatus.PENDING,
      paymentMethod,
      paymentUrl: gatewayResult.paymentUrl,
      qrCode: gatewayResult.qrCode,
      transactionId: transaction.id,
      message: `${paymentMethod} payment request created`,
    };
  }

  async confirmTransaction(
    dto: ConfirmTransactionDto,
  ): Promise<PaymentResultDto> {
    const where: Record<string, unknown> = {
      orderId: dto.orderId,
      invoiceId: this.parseInvoiceId(dto.invoiceId),
    };

    if (dto.paymentMethod) {
      where.paymentMethod = dto.paymentMethod;
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (dto.amount && dto.amount !== transaction.amount) {
      throw new BadRequestException('Amount mismatch');
    }

    if (dto.status && dto.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful confirmation is supported',
      );
    }

    if (transaction.paymentMethod === PaymentMethod.VIETQR) {
      throw new BadRequestException(
        'VietQR payments are confirmed by callback only',
      );
    }

    const gateway = this.gatewayFactory.getConfirmationGateway(
      transaction.paymentMethod as PaymentMethod,
    );
    const transactionRef = this.transactionRefResolver.resolve(transaction);
    const confirmResult = await gateway.confirmPayment(transactionRef);

    const transactionId =
      (confirmResult.providerData?.captureId as string) ||
      dto.transactionId ||
      transaction.gatewayOrderId ||
      '';
    const transactionContent =
      dto.transactionContent ||
      (confirmResult.providerData ? 'Captured via gateway' : '');
    const transactionDateTime = dto.transactionDateTime
      ? new Date(dto.transactionDateTime)
      : new Date();

    const updated =
      await this.paymentCompletionService.completeSuccessfulPayment({
        transactionId: transaction.id,
        data: {
          transactionId,
          transactionContent,
          transactionDateTime,
        },
        fallbackProviderTransactionId: transactionId,
      });

    return {
      success: true,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      paymentUrl: '',
      qrCode: updated.qrCode || '',
      transactionId: updated.id,
      message: 'Payment transaction confirmed',
    };
  }

  async cancelPendingTransaction(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (
      transaction.status !== PaymentStatus.PENDING &&
      transaction.status !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot cancel transaction from ${transaction.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTransaction =
        transaction.status === PaymentStatus.PENDING
          ? await tx.paymentTransaction.update({
              where: { id: transaction.id },
              data: { status: PaymentStatus.FAILED },
            })
          : transaction;

      const updatedOrder = await tx.order.updateMany({
        where: {
          orderId: transaction.orderId,
          status: ORDER_STATUS_PENDING_PAYMENT,
        },
        data: { status: ORDER_STATUS_CANCELLED, updatedAt: new Date() },
      });

      if (updatedOrder.count === 0) {
        throw new BadRequestException(
          'Only pending payment orders can be cancelled from payment page',
        );
      }

      return {
        orderId: transaction.orderId,
        orderStatus: ORDER_STATUS_CANCELLED,
        transactionId: updatedTransaction.id,
        transactionStatus: updatedTransaction.status,
      };
    });
  }

  async requestCustomerRefund(dto: CustomerRefundRequestDto) {
    const order = await this.prisma.order.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== ORDER_STATUS_PENDING_PROCESSING) {
      throw new BadRequestException(
        'Order can no longer be cancelled (already approved, rejected or cancelled)',
      );
    }

    const reason = dto.reason?.trim() || 'Customer requested refund';
    const refundResult = await this.refundPaidOrder(order.orderId, reason);

    // Cancelling restores reserved stock and flips the order to CANCELLED,
    // mirroring the manager rejectOrder flow.
    const orderProducts = await this.prisma.orderProduct.findMany({
      where: { orderId: order.id },
    });
    for (const op of orderProducts) {
      await this.prisma.product.update({
        where: { id: op.productId },
        data: { quantity: { increment: op.quantity } },
      });
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS_CANCELLED, updatedAt: new Date() },
    });

    return refundResult;
  }

  async getRefundOrderInfo(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: { invoice: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const transaction =
      await this.findLatestPaymentTransactionByOrderId(orderId);

    return {
      orderId: order.orderId,
      customerName: order.customerName,
      status: order.status,
      paymentMethod: transaction?.paymentMethod ?? null,
      totalAmount: order.invoice
        ? order.invoice.totalAmount.toNumber()
        : order.subtotal.toNumber() + order.deliveryFee.toNumber(),
      cancellable: order.status === ORDER_STATUS_PENDING_PROCESSING,
    };
  }

  async refundPaidOrder(orderId: string, reason: string) {
    const transaction =
      await this.findLatestPaymentTransactionByOrderId(orderId);
    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    ensureCanMarkRefundRequired(transaction.status);

    let refundStatus = PaymentStatus.REFUND_REQUIRED;

    try {
      const gateway = this.gatewayFactory.getRefundGateway(
        transaction.paymentMethod as PaymentMethod,
      );
      await gateway.refundPayment(
        transaction.transactionId || transaction.id,
        transaction.amount,
      );
      if (transaction.paymentMethod === PaymentMethod.PAYPAL) {
        refundStatus = PaymentStatus.REFUNDED;
      }
    } catch {
      // Some providers, such as VietQR, require manual refund handling.
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: refundStatus },
    });

    return {
      status: refundStatus,
      orderId,
      reason,
      message:
        refundStatus === PaymentStatus.REFUNDED
          ? 'Refund processed successfully'
          : 'Your refund request has been received. We will contact you shortly to complete the refund.',
    };
  }

  async getPaymentTransactionByOrderId(
    orderId: string,
    paymentMethod?: PaymentMethod,
  ) {
    const transaction = await this.findLatestPaymentTransactionByOrderId(
      orderId,
      paymentMethod,
    );

    return transaction ? this.serializePaymentTransaction(transaction) : null;
  }

  private parseInvoiceId(invoiceId: string): bigint {
    if (!/^\d+$/.test(invoiceId)) {
      throw new BadRequestException('Invoice id must be a numeric string');
    }

    return BigInt(invoiceId);
  }

  private findLatestPaymentTransactionByOrderId(
    orderId: string,
    paymentMethod?: PaymentMethod,
  ) {
    return this.prisma.paymentTransaction.findFirst({
      where: {
        orderId,
        ...(paymentMethod ? { paymentMethod } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private serializePaymentTransaction(
    transaction: Awaited<
      ReturnType<PaymentService['findLatestPaymentTransactionByOrderId']>
    >,
  ) {
    if (!transaction) {
      return null;
    }

    return {
      ...transaction,
      invoiceId: transaction.invoiceId.toString(),
    };
  }
}
