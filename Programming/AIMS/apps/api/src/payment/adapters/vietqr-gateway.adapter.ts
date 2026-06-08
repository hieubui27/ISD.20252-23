import { BadRequestException, Injectable } from '@nestjs/common';
import { VietqrService } from '../../vietqr/vietqr.service';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentGateway,
  PaymentGatewayContext,
  PaymentGatewayResult,
} from '../ports/payment-gateway.port';
import { normalizeVietqrContent } from '../../vietqr/helpers/vietqr-normalize.helper';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This adapter wraps VietqrService behind the PaymentGateway interface.
 * - It receives only PaymentGatewayContext primitives and returns PaymentGatewayResult.
 *
 * Cohesion reason:
 * - All methods adapt VietQR-specific provider operations to the unified gateway contract.
 */
@Injectable()
export class VietqrGatewayAdapter implements PaymentGateway {
  constructor(private readonly vietqrService: VietqrService) {}

  getMethod(): PaymentMethod {
    return PaymentMethod.VIETQR;
  }

  async createPayment(
    context: PaymentGatewayContext,
  ): Promise<PaymentGatewayResult> {
    const qrContent = normalizeVietqrContent(`AIMS ${context.gatewayOrderId}`);
    const qrCodeData = await this.vietqrService.generateQrCode({
      orderId: context.gatewayOrderId,
      invoiceId: context.invoiceId || '',
      amount: context.amount,
      description: qrContent,
      returnUrl: process.env.VIETQR_RETURN_URL,
      cancelUrl: process.env.VIETQR_CANCEL_URL,
    });

    return {
      paymentUrl: qrCodeData.qrLink || '',
      qrCode: qrCodeData.qrCode,
      providerData: {
        qrContent: qrCodeData.qrContent || qrContent,
        qrDataUrl: qrCodeData.qrDataUrl,
        qrLink: qrCodeData.qrLink,
        expiredAt: qrCodeData.expiredAt,
      },
    };
  }

  async confirmPayment(_transactionRef: string): Promise<PaymentGatewayResult> {
    // VietQR xác nhận qua callback tự động (vqr/bank/api/transaction-sync),
    // không cần gọi confirm thủ công từ phía client.
    return { paymentUrl: '', qrCode: '' };
  }

  async refundPayment(
    _transactionRef: string,
    _amount: number,
  ): Promise<PaymentGatewayResult> {
    // VietQR không hỗ trợ hoàn tiền tự động qua API.
    // Cần xử lý thủ công bởi Product Manager.
    throw new BadRequestException(
      'VietQR refund requires manual product manager handling',
    );
  }
}
