import { PaymentStatus } from '../../services/payment.service';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';

export interface PaymentTransactionStatus {
  id: string;
  orderId: string;
  invoiceId: string;
  paymentMethod: string;
  provider: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  transactionContent?: string;
  transactionDateTime?: string;
  gatewayOrderId?: string;
  qrCode?: string;
  qrContent?: string;
  qrDataUrl?: string;
  qrLink?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VietQrPaymentInput {
  existingPayment: ExistingPaymentContext;
}

export interface ExistingPaymentContext {
  orderId: string;
  invoiceId: string;
  totalAmount: number;
  customerEmail: string;
}

export interface VietQrPaymentSnapshot {
  payment: PlaceOrderPaymentResult;
  latestTransaction?: PaymentTransactionStatus | null;
}

export interface VietQrTestCallbackRequest {
  bankAccount?: string;
  bankCode?: string;
  content: string;
  amount: number;
  transType: string;
}
