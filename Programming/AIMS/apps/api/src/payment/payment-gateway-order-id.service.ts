import { Injectable } from '@nestjs/common';
import { PaymentMethod } from './constants/payment.constants';
import { buildPaymentGatewayOrderId } from './helpers/payment-reference.helper';
import { PaymentTransactionService } from './payment-transaction.service';

interface PaymentGatewayOrderTransaction {
  id: string;
  gatewayOrderId: string | null;
}

@Injectable()
export class PaymentGatewayOrderIdService {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  async ensureForCreatePayment(
    paymentMethod: PaymentMethod,
    transaction: PaymentGatewayOrderTransaction,
  ): Promise<string> {
    const localGatewayOrderId = buildPaymentGatewayOrderId(transaction.id);

    if (paymentMethod === PaymentMethod.VIETQR) {
      await this.paymentTransactionService.updateGatewayOrderId(
        transaction.id,
        localGatewayOrderId,
      );

      return localGatewayOrderId;
    }

    return transaction.gatewayOrderId || localGatewayOrderId;
  }
}
