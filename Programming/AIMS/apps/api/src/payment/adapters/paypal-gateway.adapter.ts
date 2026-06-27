import { BadRequestException, Injectable } from '@nestjs/common';
import { PaypalService } from '../../paypal/paypal.service';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentConfirmationGateway,
  PaymentCreationGateway,
  PaymentGatewayContext,
  PaymentGatewayResult,
  PaymentRefundGateway,
} from '../ports/payment-gateway.port';
import { convertMoneyToUSD } from '../helpers/payment-transaction-status.helper';

interface PaypalApprovalLink {
  rel: string;
  href: string;
  method: string;
}

/**
 * Adapter: PaypalGatewayAdapter
 *
 * SOLID Review:
 * SRP: Satisfied. It adapts PayPal operations to the payment gateway contract.
 * OCP: Satisfied. PaymentService does not change when this adapter changes internally.
 * LSP: Satisfied. It can be used wherever a PayPal gateway implementation is expected.
 * ISP: Satisfied. It implements only the gateway capabilities PayPal supports.
 * DIP: Satisfied. PaymentService depends on the gateway interface, not PaypalService.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The adapter maps PaymentGatewayContext to PaypalService calls and
 *   returns the shared payment result shape.
 */
@Injectable()
export class PaypalGatewayAdapter
  implements
    PaymentCreationGateway,
    PaymentConfirmationGateway,
    PaymentRefundGateway
{
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
      approvalLinks.find((link) =>
        ['approve', 'payer-action'].includes(link.rel),
      )?.href || '';

    if (!order?.id || !approveLink) {
      throw new BadRequestException(
        'PayPal order response is missing approval data',
      );
    }

    return {
      paymentUrl: approveLink,
      qrCode: '',
      providerData: { paypalOrderId: order.id, links: order.links },
      transactionUpdate: { gatewayOrderId: order.id },
    };
  }

  async confirmPayment(transactionRef: string): Promise<PaymentGatewayResult> {
    const captureResult =
      await this.paypalService.capturePayment(transactionRef);

    // Store the PayPal capture ID so refund can use the same provider reference.
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

  async refundPayment(transactionRef: string): Promise<PaymentGatewayResult> {
    const refundResult = await this.paypalService.refundPayment(transactionRef);
    return {
      paymentUrl: '',
      qrCode: '',
      providerData: refundResult,
    };
  }
}
