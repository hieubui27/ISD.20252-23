import { PaymentMethod, PaymentStatus } from '../../services/payment.service';

export const PAYMENT_METHOD = {
  PAYPAL: 'PAYPAL',
  VIETQR: 'VIETQR',
} as const satisfies Record<string, PaymentMethod>;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUND_REQUIRED: 'REFUND_REQUIRED',
} as const satisfies Record<string, PaymentStatus>;
