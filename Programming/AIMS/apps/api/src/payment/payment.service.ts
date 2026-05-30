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

    // Factory.getGateway() sẽ throw nếu method không được hỗ trợ,
    // thay thế hoàn toàn ensureSupportedPaymentMethod().
    const gateway = this.gatewayFactory.getGateway(paymentMethod);

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
        invoiceId: dto.invoiceId,
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

    // Gọi gateway adapter thống nhất — không cần if/else cho từng provider.
    // returnUrl / cancelUrl do mỗi adapter tự đọc từ env config riêng.
    const gatewayResult = await gateway.createPayment({
      gatewayOrderId,
      amount: dto.amount,
      description: `AIMS ${gatewayOrderId}`,
      customerEmail: dto.customerEmail,
      invoiceId: dto.invoiceId,
    });

    // Lưu dữ liệu bổ sung từ provider (QR code data cho VietQR, PayPal order ID...)
    if (gatewayResult.providerData) {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: this.buildProviderDataUpdate(paymentMethod, gatewayResult),
      });
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

  async changePaymentMethod(
    dto: ChangePaymentMethodDto,
  ): Promise<PaymentResultDto> {
    // Factory.getGateway() validates support for both methods.
    this.gatewayFactory.getGateway(dto.fromMethod as PaymentMethod);
    this.gatewayFactory.getGateway(dto.toMethod as PaymentMethod);

    if (dto.fromMethod === dto.toMethod) {
      throw new BadRequestException('Payment method is unchanged');
    }

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
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
      paymentMethod: dto.toMethod as PaymentMethod,
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
        invoiceId: dto.invoiceId,
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

    // Gọi gateway.confirmPayment() để thực hiện capture/verify trên provider.
    // - PayPal: gọi PayPal Capture API → trả về capture result
    // - VietQR: no-op (callback đã xử lý)
    const gateway = this.gatewayFactory.getGateway(
      transaction.paymentMethod as PaymentMethod,
    );
    const confirmResult = await gateway.confirmPayment(
      transaction.gatewayOrderId || transaction.id,
    );

    // Merge: ưu tiên dữ liệu từ gateway response, fallback về DTO (cho confirm thủ công).
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
      invoiceId: updated.invoiceId,
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
      invoiceId: updated.invoiceId,
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
    const transaction = await this.getPaymentTransactionByOrderId(orderId);
    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    ensureCanMarkRefundRequired(transaction.status);

    // Dùng gateway factory để xử lý refund theo từng provider.
    // PayPal: gọi API refund tự động.
    // VietQR: throw exception yêu cầu xử lý thủ công.
    try {
      const gateway = this.gatewayFactory.getGateway(
        transaction.paymentMethod as PaymentMethod,
      );
      await gateway.refundPayment(
        transaction.transactionId || transaction.id,
        transaction.amount,
      );
    } catch {
      // Nếu gateway không hỗ trợ refund tự động (VietQR),
      // đánh dấu cần hoàn tiền thủ công.
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.REFUND_REQUIRED },
    });

    return {
      status: PaymentStatus.REFUND_REQUIRED,
      orderId,
      rejectReason,
      message: 'Refund required — check payment method for processing details',
    };
  }

  async getPaymentTransactionByOrderId(orderId: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Build dữ liệu update DB từ provider-specific data trả về bởi gateway adapter.
   * VietQR trả về qrContent, qrDataUrl, qrLink, expiredAt.
   * PayPal trả về paypalOrderId (hiện chưa lưu).
   */
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
      // Lưu PayPal order ID vào gatewayOrderId để confirmPayment có thể gọi capture.
      const data: Record<string, unknown> = {};
      if (gatewayResult.providerData.paypalOrderId) {
        data.gatewayOrderId = gatewayResult.providerData.paypalOrderId;
      }
      return data;
    }

    return {};
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
