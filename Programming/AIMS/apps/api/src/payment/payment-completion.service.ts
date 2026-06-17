import { Inject, Injectable } from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import {
  PLACE_ORDER_PAYMENT_PORT,
  PlaceOrderPaymentPort,
} from './ports/place-order-payment.port';

interface CompleteSuccessfulPaymentInput {
  transactionId: string;
  data: Record<string, unknown>;
  fallbackProviderTransactionId: string;
}

@Injectable()
export class PaymentCompletionService {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
    @Inject(PLACE_ORDER_PAYMENT_PORT)
    private readonly placeOrderPaymentPort: PlaceOrderPaymentPort,
  ) {}

  async completeSuccessfulPayment(input: CompleteSuccessfulPaymentInput) {
    const updated =
      await this.paymentTransactionService.markSuccessAndCancelOtherPending({
        transactionId: input.transactionId,
        data: input.data,
      });

    await this.placeOrderPaymentPort.markPaidAndPendingProcessing({
      orderId: updated.orderId,
      invoiceId: updated.invoiceId.toString(),
      paymentMethod: updated.paymentMethod,
      amount: updated.amount,
      transactionId:
        updated.transactionId || input.fallbackProviderTransactionId,
      transactionContent: updated.transactionContent,
      transactionDateTime: updated.transactionDateTime,
    });

    return updated;
  }
}
