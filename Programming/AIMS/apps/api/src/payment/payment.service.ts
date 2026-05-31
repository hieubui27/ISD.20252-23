import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaypalService } from '../paypal/paypal.service';
import { VietqrService } from '../vietqr/vietqr.service';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './constants/payment.constants';
import { ChangePaymentMethodDto } from './dto/change-payment-method.dto';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { PaymentResultDto } from './dto/payment-result.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { TransactionStatusDto } from './dto/transaction-status.dto';
import {
  PLACE_ORDER_PAYMENT_PORT,
  PlaceOrderPaymentPort,
} from './ports/place-order-payment.port';
import {
  convertMoneyToUSD,
  ensureCanMarkFailed,
  ensureCanMarkRefundRequired,
  ensureCanMarkSuccess,
} from './helpers/payment-transaction-status.helper';
import { TransactionSyncDto } from '../vietqr/dto/transaction-sync.dto';
import {
  buildGatewayOrderId,
  normalizeVietqrContent,
} from '../vietqr/helpers/vietqr-normalize.helper';

interface PaypalApprovalLink {
  rel: string;
  href: string;
  method: string;
}

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service coordinates payment through injected PrismaService, VietqrService, PaypalService, and PlaceOrderPaymentPort dependencies.
 * - It exchanges explicit DTOs, primitive identifiers, and narrow payment context data instead of accessing controller internals or shared mutable state.
 *
 * Cohesion reason:
 * - All public methods serve the payment transaction lifecycle: request, method change, confirmation, status update, lookup, and refund-required marking.
 */
@Injectable()
/**
 * SOLID review for VietQR-related payment flow:
 * - OCP: Clear violation. requestPayment branches on concrete payment methods and
 *   must be modified whenever a new payment provider is added.
 * - DIP: Clear violation. This high-level payment workflow depends directly on
 *   concrete VietqrService and PaypalService implementations instead of a payment
 *   gateway abstraction.
 * - SRP: Medium risk. The service coordinates transaction persistence,
 *   provider-specific request creation, callback confirmation, order status update,
 *   and refund-required handling.
 * - Improvement: Introduce a PaymentGatewayPort/strategy per provider. Keep
 *   PaymentService as a transaction orchestrator that selects a gateway from a
 *   registry and delegates provider-specific QR/order creation.
 */
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vietqrService: VietqrService,
    private readonly paypalService: PaypalService,
    @Inject(PLACE_ORDER_PAYMENT_PORT)
    private readonly placeOrderPaymentPort: PlaceOrderPaymentPort,
  ) {}

  async requestPayment(dto: RequestPaymentDto): Promise<PaymentResultDto> {
    const paymentMethod = dto.paymentMethod || PaymentMethod.VIETQR;
    this.ensureSupportedPaymentMethod(paymentMethod);
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

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: dto.orderId,
        invoiceId,
        paymentMethod,
        provider: paymentMethod,
        amount: dto.amount,
        status: PaymentStatus.PENDING,
      },
    });
    const gatewayOrderId = buildGatewayOrderId(transaction.id);

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { gatewayOrderId },
    });

    if (paymentMethod === PaymentMethod.VIETQR) {
      const qrContent = normalizeVietqrContent(`AIMS ${gatewayOrderId}`);
      const qrCodeData = await this.vietqrService.generateQrCode({
        orderId: gatewayOrderId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        description: qrContent,
        returnUrl: process.env.VIETQR_RETURN_URL,
        cancelUrl: process.env.VIETQR_CANCEL_URL,
      });

      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: this.buildQrTransactionUpdateData(qrCodeData, qrContent),
      });

      return {
        success: true,
        status: PaymentStatus.PENDING,
        paymentMethod,
        paymentUrl: qrCodeData.qrLink || '',
        qrCode: qrCodeData.qrCode,
        transactionId: transaction.id,
        message: 'VietQR payment request created',
      };
    }

    const paypalOrder = await this.paypalService.createOrder(
      convertMoneyToUSD(dto.amount),
    );
    const approvalLinks = (paypalOrder?.links || []) as PaypalApprovalLink[];
    const approveLink =
      approvalLinks.find((link) => link.rel === 'approve')?.href || '';

    return {
      success: true,
      status: PaymentStatus.PENDING,
      paymentMethod,
      paymentUrl: approveLink,
      qrCode: '',
      transactionId: transaction.id,
      message: 'PayPal payment request created',
    };
  }

  async changePaymentMethod(
    dto: ChangePaymentMethodDto,
  ): Promise<PaymentResultDto> {
    this.ensureSupportedPaymentMethod(dto.fromMethod);
    this.ensureSupportedPaymentMethod(dto.toMethod);

    if (dto.fromMethod === dto.toMethod) {
      throw new BadRequestException('Payment method is unchanged');
    }

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: dto.orderId,
        invoiceId: this.parseInvoiceId(dto.invoiceId),
        paymentMethod: dto.fromMethod,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (existing.status === PaymentStatus.PENDING) {
      // Keep transaction history; pending transaction is closed as failed before creating a new one.
      ensureCanMarkFailed(existing.status);
      await this.prisma.paymentTransaction.update({
        where: { id: existing.id },
        data: { status: PaymentStatus.FAILED },
      });
    }

    const paymentContext = await this.placeOrderPaymentPort.getPaymentContext({
      orderId: dto.orderId,
      invoiceId: dto.invoiceId,
      amount: existing.amount,
      customerEmail: dto.customerEmail,
    });

    return this.requestPayment({
      orderId: dto.orderId,
      invoiceId: dto.invoiceId,
      paymentMethod: dto.toMethod,
      amount: paymentContext.totalAmount,
      customerEmail: paymentContext.customerEmail,
    });
  }

  async confirmTransaction(
    dto: ConfirmTransactionDto,
  ): Promise<PaymentResultDto> {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: dto.orderId,
        invoiceId: this.parseInvoiceId(dto.invoiceId),
      },
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

    ensureCanMarkSuccess(transaction.status);

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: dto.status || PaymentStatus.SUCCESS,
        transactionId: dto.transactionId,
        transactionContent: dto.transactionContent,
        transactionDateTime: new Date(dto.transactionDateTime),
      },
    });

    await this.placeOrderPaymentPort.markPaidAndPendingProcessing({
      orderId: updated.orderId,
      invoiceId: updated.invoiceId.toString(),
      paymentMethod: updated.paymentMethod,
      amount: updated.amount,
      transactionId: updated.transactionId || dto.transactionId,
      transactionContent: updated.transactionContent,
      transactionDateTime: updated.transactionDateTime,
    });
    // TODO(NOTIFICATION_INTEGRATION): Send invoice and transaction information to the customer email after success.

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

  async confirmTransactionFromVietqrCallback(
    callback: TransactionSyncDto,
  ): Promise<{
    status: TransactionStatusDto;
    refTransactionId: string;
    duplicate: boolean;
  }> {
    if (callback.transType !== (process.env.VIETQR_TRANS_TYPE || 'C')) {
      throw new BadRequestException('Invalid VietQR transaction type');
    }

    const duplicate = await this.findDuplicateCallback(callback);
    if (duplicate) {
      return {
        status: {
          transactionId: callback.transactionid,
          status: duplicate.status,
          message: 'Transaction already processed',
          paidAmount: callback.amount,
        },
        refTransactionId: duplicate.id,
        duplicate: true,
      };
    }

    const transaction = await this.findVietqrTransaction(callback);
    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.amount !== callback.amount) {
      throw new BadRequestException('Amount mismatch');
    }

    if (transaction.status === PaymentStatus.SUCCESS) {
      return {
        status: {
          transactionId: callback.transactionid,
          status: transaction.status,
          message: 'Transaction already processed',
          paidAmount: callback.amount,
        },
        refTransactionId: transaction.id,
        duplicate: true,
      };
    }

    ensureCanMarkSuccess(transaction.status);

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.SUCCESS,
        transactionId: callback.transactionid,
        transactionContent: callback.content,
        transactionDateTime: new Date(callback.transactiontime),
        gatewayReferenceNumber: callback.referencenumber,
      },
    });

    await this.placeOrderPaymentPort.markPaidAndPendingProcessing({
      orderId: updated.orderId,
      invoiceId: updated.invoiceId.toString(),
      paymentMethod: updated.paymentMethod,
      amount: updated.amount,
      transactionId: updated.transactionId || callback.transactionid,
      transactionContent: updated.transactionContent,
      transactionDateTime: updated.transactionDateTime,
    });
    // TODO(NOTIFICATION_INTEGRATION): Send invoice and transaction information to the customer email after success.

    return {
      status: this.vietqrService.mapCallbackToTransactionStatus(callback),
      refTransactionId: updated.id,
      duplicate: false,
    };
  }

  async updateTransactionFailure(transactionId: string): Promise<void> {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    ensureCanMarkFailed(transaction.status);
    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  async handleRejectedOrderRefund(orderId: string, rejectReason: string) {
    const transaction = await this.findLatestPaymentTransactionByOrderId(
      orderId,
    );
    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    ensureCanMarkRefundRequired(transaction.status);

    if (transaction.paymentMethod === PaymentMethod.PAYPAL) {
      // TODO(PAYPAL_INTEGRATION): Store PayPal capture id and call refundPayment(captureId).
      throw new BadRequestException('PayPal refund is not fully implemented');
    }

    // TODO(REFUND_INTEGRATION): Trigger manual VietQR refund workflow for Product Manager review.
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.REFUND_REQUIRED },
    });

    return {
      status: PaymentStatus.REFUND_REQUIRED,
      orderId,
      rejectReason,
      message: 'VietQR refund requires manual product manager handling',
    };
  }

  async getPaymentTransactionByOrderId(orderId: string) {
    const transaction = await this.findLatestPaymentTransactionByOrderId(
      orderId,
    );

    return transaction ? this.serializePaymentTransaction(transaction) : null;
  }

  private ensureSupportedPaymentMethod(paymentMethod: string): void {
    if (
      paymentMethod !== PaymentMethod.VIETQR &&
      paymentMethod !== PaymentMethod.PAYPAL
    ) {
      throw new BadRequestException('Unsupported payment method');
    }
  }

  private parseInvoiceId(invoiceId: string): bigint {
    if (!/^\d+$/.test(invoiceId)) {
      throw new BadRequestException('Invoice id must be a numeric string');
    }

    return BigInt(invoiceId);
  }

  private findLatestPaymentTransactionByOrderId(orderId: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private serializePaymentTransaction(transaction: Record<string, any>) {
    return {
      ...transaction,
      invoiceId: transaction.invoiceId?.toString(),
    };
  }

  private buildQrTransactionUpdateData(
    qrCodeData: {
      qrCode: string;
      qrContent?: string;
      qrDataUrl?: string;
      qrLink?: string;
      expiredAt?: Date;
    },
    fallbackQrContent: string,
  ) {
    const data: {
      qrCode: string;
      qrContent: string;
      qrDataUrl?: string;
      qrLink?: string;
      expiredAt?: Date;
    } = {
      qrCode: qrCodeData.qrCode,
      qrContent: qrCodeData.qrContent || fallbackQrContent,
    };

    if (qrCodeData.qrDataUrl) {
      data.qrDataUrl = qrCodeData.qrDataUrl;
    }

    if (qrCodeData.qrLink) {
      data.qrLink = qrCodeData.qrLink;
    }

    if (qrCodeData.expiredAt) {
      data.expiredAt = qrCodeData.expiredAt;
    }

    return data;
  }

  private async findDuplicateCallback(callback: TransactionSyncDto) {
    const byTransactionId = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: callback.transactionid },
    });

    if (byTransactionId) {
      return byTransactionId;
    }

    if (!callback.referencenumber) {
      return null;
    }

    return this.prisma.paymentTransaction.findFirst({
      where: { gatewayReferenceNumber: callback.referencenumber },
    });
  }

  private async findVietqrTransaction(callback: TransactionSyncDto) {
    const lookupConditions: Record<string, unknown>[] = [];

    if (callback.orderId) {
      lookupConditions.push({ gatewayOrderId: callback.orderId });
    }

    if (callback.content) {
      lookupConditions.push({ qrContent: callback.content });
    }

    if (lookupConditions.length === 0) {
      return null;
    }

    return this.prisma.paymentTransaction.findFirst({
      where: {
        provider: PaymentProvider.VIETQR,
        OR: lookupConditions,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
