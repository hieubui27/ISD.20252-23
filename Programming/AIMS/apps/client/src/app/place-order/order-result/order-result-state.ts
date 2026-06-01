import { PaymentMethod, PaymentStatus } from '../../services/payment.service';

export const ORDER_RESULT_STATE_KEY = 'aims_order_result';

export interface OrderResultState {
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  orderId: string;
  invoiceId: string;
  completedAt: string;
}
