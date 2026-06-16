import { ExistingPaymentContext } from './vietqr-payment.models';

export interface PendingPaymentSession extends ExistingPaymentContext {
  checkoutKey: string;
}

export interface PaypalPaymentSession {
  orderId: string;
  invoiceId: string;
}
