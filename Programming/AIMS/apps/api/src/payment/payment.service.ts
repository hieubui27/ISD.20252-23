import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

interface RefundTokenPayload {
  orderId: string;
  email: string;
  purpose: 'refund';
}

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
    private readonly jwtService: JwtService,
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

  async updateTransactionFailure(transactionId: string): Promise<void> {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    await this.paymentTransactionService.markFailed(transactionId);
  }

  async requestCustomerRefund(dto: CustomerRefundRequestDto) {
    const payload = this.verifyRefundToken(dto.token);
    const order = await this.prisma.order.findUnique({
      where: { orderId: payload.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw new UnauthorizedException('Refund token does not match order');
    }

    const reason = dto.reason?.trim() || 'Customer requested refund';
    return this.refundPaidOrder(payload.orderId, reason);
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
          : 'Refund required - check payment method for processing details',
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

  private verifyRefundToken(token: string): RefundTokenPayload {
    try {
      const payload = this.jwtService.verify<Partial<RefundTokenPayload>>(
        token,
        {
          secret: this.getRefundTokenSecret(),
        },
      );

      if (payload.purpose !== 'refund' || !payload.orderId || !payload.email) {
        throw new UnauthorizedException('Invalid refund token');
      }

      return {
        orderId: payload.orderId,
        email: payload.email,
        purpose: 'refund',
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException('Invalid or expired refund token');
    }
  }

  private getRefundTokenSecret(): string {
    return (
      process.env.REFUND_TOKEN_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      'super-secret-key-change-me-in-prod'
    );
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
