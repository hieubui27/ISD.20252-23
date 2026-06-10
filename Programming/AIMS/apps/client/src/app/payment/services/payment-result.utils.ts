import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import { PaymentResultDto } from '../../services/payment.service';

interface PaymentResultContext {
  orderId: string;
  invoiceId: string;
  totalAmount: number;
}

export function mapPaymentResult(
  payment: PaymentResultContext,
  result: PaymentResultDto,
): PlaceOrderPaymentResult {
  return {
    orderId: payment.orderId,
    invoiceId: payment.invoiceId,
    totalAmount: payment.totalAmount,
    paymentMethod: result.paymentMethod,
    paymentStatus: result.status,
    paymentUrl: result.paymentUrl,
    qrCode: result.qrCode,
    paymentTransactionId: result.transactionId,
    message: result.message,
  };
}

export function readPaymentErrorMessage(
  err: unknown,
  fallback: string,
): string {
  const possibleError = err as {
    error?: { message?: string };
    message?: string;
  };

  return possibleError.error?.message || possibleError.message || fallback;
}
