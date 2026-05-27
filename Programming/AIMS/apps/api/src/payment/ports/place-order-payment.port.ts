export const PLACE_ORDER_PAYMENT_PORT = 'PLACE_ORDER_PAYMENT_PORT';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This port exposes only payment context lookup data and primitive order identifiers to PaymentService.
 * - It hides PlaceOrder implementation details and avoids sharing large order objects with payment code.
 *
 * Cohesion reason:
 * - All interfaces define the payment-facing boundary that PlaceOrder integration must implement.
 */
export interface PaymentContextLookup {
  orderId: string;
  invoiceId: string;
  amount?: number;
  customerEmail?: string;
}

export interface PaymentContext {
  orderId: string;
  invoiceId: string;
  totalAmount: number;
  customerEmail: string;
}

export interface PaidOrderContext {
  orderId: string;
  invoiceId: string;
  paymentMethod: string;
  amount: number;
  transactionId: string;
  transactionContent?: string | null;
  transactionDateTime?: Date | null;
}

export interface PlaceOrderPaymentPort {
  getPaymentContext(lookup: PaymentContextLookup): Promise<PaymentContext>;
  markPaidAndPendingProcessing(context: PaidOrderContext): Promise<void>;
}
