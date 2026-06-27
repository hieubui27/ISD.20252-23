export const PLACE_ORDER_PAYMENT_PORT = 'PLACE_ORDER_PAYMENT_PORT';

/**
 * Port: PlaceOrderPaymentPort
 *
 * SOLID Review:
 * SRP: Satisfied. The port exposes only the order operations needed by payment.
 * OCP: Satisfied. A different order adapter can implement the same contract.
 * LSP: Satisfied. Implementations can replace each other through this port.
 * ISP: Satisfied. The port has only context lookup and paid-transition methods.
 * DIP: Satisfied. PaymentService depends on this port, not a concrete order service.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The port passes small payment-facing DTOs and groups order-payment
 *   integration methods.
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
