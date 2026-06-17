import { Injectable } from '@nestjs/common';
import { VietqrService } from '../../vietqr/vietqr.service';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentCreationGateway,
  PaymentGatewayContext,
  PaymentGatewayResult,
} from '../ports/payment-gateway.port';
import { normalizeVietqrContent } from '../../vietqr/helpers/vietqr-normalize.helper';

@Injectable()
export class VietqrGatewayAdapter implements PaymentCreationGateway {
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
      transactionUpdate: {
        qrCode: qrCodeData.qrCode,
        qrContent: qrCodeData.qrContent || qrContent,
        ...(qrCodeData.qrDataUrl ? { qrDataUrl: qrCodeData.qrDataUrl } : {}),
        ...(qrCodeData.qrLink ? { qrLink: qrCodeData.qrLink } : {}),
        ...(qrCodeData.expiredAt ? { expiredAt: qrCodeData.expiredAt } : {}),
      },
    };
  }
}
