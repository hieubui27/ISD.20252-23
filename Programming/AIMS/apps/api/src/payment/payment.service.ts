import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './constants/payment.constants';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { PaymentResultDto } from './dto/payment-result.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { TransactionStatusDto } from './dto/transaction-status.dto';
import {
  PLACE_ORDER_PAYMENT_PORT,
  PlaceOrderPaymentPort,
} from './ports/place-order-payment.port';
import {
  ensureCanMarkFailed,
  ensureCanMarkRefundRequired,
  ensureCanMarkSuccess,
} from './helpers/payment-transaction-status.helper';
import { TransactionSyncDto } from '../vietqr/dto/transaction-sync.dto';
import { VietqrService } from '../vietqr/vietqr.service';
import { buildGatewayOrderId } from '../vietqr/helpers/vietqr-normalize.helper';
import { PaymentGatewayFactory } from './strategies/payment-gateway.factory';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service coordinates payment through PaymentGatewayFactory, PrismaService, and PlaceOrderPaymentPort.
 * - It no longer depends directly on PaypalService or VietqrService for creating payments.
 * - VietqrService is retained only for the VietQR callback flow (confirmTransactionFromVietqrCallback),
 *   which is initiated by VietQR's server and requires VietQR-specific callback response mapping.
 *
 * Cohesion reason:
 * - All public methods serve the payment transaction lifecycle: request, method change, confirmation,
 *   status update, lookup, and refund-required marking.
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vietqrService: VietqrService,
    private readonly gatewayFactory: PaymentGatewayFactory,
    @Inject(PLACE_ORDER_PAYMENT_PORT)
    private readonly placeOrderPaymentPort: PlaceOrderPaymentPort,
  ) {}

  async requestPayment(dto: RequestPaymentDto): Promise<PaymentResultDto> {
    const paymentMethod = dto.paymentMethod || PaymentMethod.VIETQR;
    const gateway = this.gatewayFactory.getGateway(paymentMethod);
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
    const localGatewayOrderId = buildGatewayOrderId(transaction.id);

    if (paymentMethod === PaymentMethod.VIETQR) {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { gatewayOrderId: localGatewayOrderId },
      });
    }

    let gatewayResult: Awaited<ReturnType<typeof gateway.createPayment>>;
    try {
      gatewayResult = await gateway.createPayment({
        gatewayOrderId: localGatewayOrderId,
        amount: dto.amount,
        description: `AIMS ${localGatewayOrderId}`,
        customerEmail: dto.customerEmail,
        invoiceId: dto.invoiceId,
      });
    } catch (err) {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw err;
    }

    if (gatewayResult.providerData) {
      const providerUpdate = this.buildProviderDataUpdate(
        paymentMethod,
        gatewayResult,
      );

      if (
        paymentMethod === PaymentMethod.PAYPAL &&
        !providerUpdate.gatewayOrderId
      ) {
        await this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: PaymentStatus.FAILED },
        });
        throw new BadRequestException(
          'PayPal order id was not returned by PayPal',
        );
      }

      if (Object.keys(providerUpdate).length > 0) {
        await this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: providerUpdate,
        });
      }
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

    ensureCanMarkSuccess(transaction.status);

    const gateway = this.gatewayFactory.getGateway(
      transaction.paymentMethod as PaymentMethod,
    );
    const transactionRef = this.resolveGatewayTransactionRef(transaction);
    const confirmResult = await gateway.confirmPayment(
      transactionRef,
    );

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

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: dto.status || PaymentStatus.SUCCESS,
        transactionId,
        transactionContent,
        transactionDateTime,
      },
    });

    await this.placeOrderPaymentPort.markPaidAndPendingProcessing({
      orderId: updated.orderId,
      invoiceId: updated.invoiceId.toString(),
      paymentMethod: updated.paymentMethod,
      amount: updated.amount,
      transactionId: updated.transactionId || transactionId,
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

    try {
      const gateway = this.gatewayFactory.getGateway(
        transaction.paymentMethod as PaymentMethod,
      );
      await gateway.refundPayment(
        transaction.transactionId || transaction.id,
        transaction.amount,
      );
    } catch {
      // Some providers, such as VietQR, require manual refund handling.
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.REFUND_REQUIRED },
    });

    return {
      status: PaymentStatus.REFUND_REQUIRED,
      orderId,
      rejectReason,
      message: 'Refund required - check payment method for processing details',
    };
  }

  async getPaymentTransactionByOrderId(orderId: string) {
    const transaction = await this.findLatestPaymentTransactionByOrderId(
      orderId,
    );

    return transaction ? this.serializePaymentTransaction(transaction) : null;
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

  private buildProviderDataUpdate(
    paymentMethod: PaymentMethod,
    gatewayResult: { qrCode: string; providerData?: Record<string, unknown> },
  ) {
    if (paymentMethod === PaymentMethod.VIETQR && gatewayResult.providerData) {
      const data: Record<string, unknown> = {
        qrCode: gatewayResult.qrCode,
        qrContent: gatewayResult.providerData.qrContent || '',
      };

      if (gatewayResult.providerData.qrDataUrl) {
        data.qrDataUrl = gatewayResult.providerData.qrDataUrl;
      }
      if (gatewayResult.providerData.qrLink) {
        data.qrLink = gatewayResult.providerData.qrLink;
      }
      if (gatewayResult.providerData.expiredAt) {
        data.expiredAt = gatewayResult.providerData.expiredAt;
      }

      return data;
    }

    if (paymentMethod === PaymentMethod.PAYPAL && gatewayResult.providerData) {
      const data: Record<string, unknown> = {};
      if (gatewayResult.providerData.paypalOrderId) {
        data.gatewayOrderId = gatewayResult.providerData.paypalOrderId;
      }
      return data;
    }

    return {};
  }

  private resolveGatewayTransactionRef(transaction: {
    id: string;
    paymentMethod: string;
    gatewayOrderId: string | null;
  }): string {
    if (transaction.paymentMethod !== PaymentMethod.PAYPAL) {
      return transaction.gatewayOrderId || transaction.id;
    }

    if (!transaction.gatewayOrderId) {
      throw new BadRequestException(
        'PayPal order id is missing. Please create a new PayPal payment.',
      );
    }

    const localGatewayOrderId = buildGatewayOrderId(transaction.id);
    if (transaction.gatewayOrderId === localGatewayOrderId) {
      throw new BadRequestException(
        'PayPal order id is invalid. Please create a new PayPal payment.',
      );
    }

    return transaction.gatewayOrderId;
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
