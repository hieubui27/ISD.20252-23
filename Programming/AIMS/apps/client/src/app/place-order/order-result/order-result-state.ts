import { PaymentMethod, PaymentStatus } from '../../services/payment.service';

export const ORDER_RESULT_STATE_KEY = 'aims_order_result';

export interface OrderResultState {
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  orderId: string;
  invoiceId: string;
  completedAt: string;
  // General order info (Table 3 - output after a successful payment).
  customerName?: string;
  phoneNumber?: string;
  province?: string;
  streetAddress?: string;
  totalAmount?: number;
  // Transaction info.
  transactionContent?: string;
  transactionDateTime?: string;
}
