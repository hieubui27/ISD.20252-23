import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from './constants/payment.constants';
import { buildPaymentGatewayOrderId } from './helpers/payment-reference.helper';

interface PaymentGatewayTransactionRefInput {
  id: string;
  paymentMethod: string;
  gatewayOrderId: string | null;
}

@Injectable()
export class PaymentGatewayTransactionRefResolver {
  resolve(transaction: PaymentGatewayTransactionRefInput): string {
    if (transaction.paymentMethod !== PaymentMethod.PAYPAL) {
      return transaction.gatewayOrderId || transaction.id;
    }

    if (!transaction.gatewayOrderId) {
      throw new BadRequestException(
        'PayPal order id is missing. Please create a new PayPal payment.',
      );
    }

    const localGatewayOrderId = buildPaymentGatewayOrderId(transaction.id);
    if (transaction.gatewayOrderId === localGatewayOrderId) {
      throw new BadRequestException(
        'PayPal order id is invalid. Please create a new PayPal payment.',
      );
    }

    return transaction.gatewayOrderId;
  }
}
