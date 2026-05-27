import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PaidOrderContext,
  PaymentContext,
  PaymentContextLookup,
  PlaceOrderPaymentPort,
} from '../ports/place-order-payment.port';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This temporary adapter communicates with PaymentService through the PlaceOrderPaymentPort contract.
 * - It receives only the payment context lookup fields needed while PlaceOrder is not integrated.
 *
 * Cohesion reason:
 * - All methods provide the temporary PlaceOrder payment context and the temporary paid-order notification boundary.
 */
@Injectable()
export class FakePlaceOrderPaymentAdapter implements PlaceOrderPaymentPort {
  async getPaymentContext(
    lookup: PaymentContextLookup,
  ): Promise<PaymentContext> {
    // TODO(PLACE_ORDER_INTEGRATION): Replace with real PlaceOrder adapter.
    if (!lookup.amount || lookup.amount <= 0) {
      throw new BadRequestException(
        'Temporary PlaceOrder payment context requires amount',
      );
    }

    return {
      orderId: lookup.orderId,
      invoiceId: lookup.invoiceId,
      totalAmount: lookup.amount,
      customerEmail: lookup.customerEmail || 'customer.demo@gmail.com',
    };
  }

  async markPaidAndPendingProcessing(context: PaidOrderContext): Promise<void> {
    // TODO(PLACE_ORDER_INTEGRATION): Mark the real order as paid and pending processing.
    console.log(
      `TODO(PLACE_ORDER_INTEGRATION): order ${context.orderId} paid; pending processing.`,
    );
  }
}
