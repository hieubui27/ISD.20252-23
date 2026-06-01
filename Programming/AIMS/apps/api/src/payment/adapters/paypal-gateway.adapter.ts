import { Injectable } from '@nestjs/common';
import { PaypalService } from '../../paypal/paypal.service';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentGateway,
  PaymentGatewayContext,
  PaymentGatewayResult,
} from '../ports/payment-gateway.port';
import { convertMoneyToUSD } from '../helpers/payment-transaction-status.helper';

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
 * - This adapter wraps PaypalService behind the PaymentGateway interface.
 * - It receives only PaymentGatewayContext primitives and returns PaymentGatewayResult.
 *
 * Cohesion reason:
 * - All methods adapt PayPal-specific provider operations to the unified gateway contract.
 */
@Injectable()
export class PaypalGatewayAdapter implements PaymentGateway {
  constructor(private readonly paypalService: PaypalService) {}

  getMethod(): PaymentMethod {
    return PaymentMethod.PAYPAL;
  }

  async createPayment(
    context: PaymentGatewayContext,
  ): Promise<PaymentGatewayResult> {
    const usdAmount = convertMoneyToUSD(context.amount);
    const order = await this.paypalService.createOrder(usdAmount);
    const approvalLinks = (order?.links || []) as PaypalApprovalLink[];
    const approveLink =
      approvalLinks.find((link) => link.rel === 'payer-action')?.href || '';

    return {
      paymentUrl: approveLink,
      qrCode: '',
      providerData: { paypalOrderId: order.id, links: order.links },
    };
  }

  async confirmPayment(transactionRef: string): Promise<PaymentGatewayResult> {
    const captureResult =
      await this.paypalService.capturePayment(transactionRef);

    // Trích xuất captureId từ response để PaymentService lưu vào DB.
    // captureId cần thiết cho refund sau này.
    const captures =
      captureResult?.purchase_units?.[0]?.payments?.captures || [];
    const captureId = captures[0]?.id || '';

    return {
      paymentUrl: '',
      qrCode: '',
      providerData: {
        ...captureResult,
        captureId,
      },
    };
  }

  async refundPayment(
    transactionRef: string,
    _amount: number,
  ): Promise<PaymentGatewayResult> {
    const refundResult = await this.paypalService.refundPayment(transactionRef);
    return {
      paymentUrl: '',
      qrCode: '',
      providerData: refundResult,
    };
  }
}
