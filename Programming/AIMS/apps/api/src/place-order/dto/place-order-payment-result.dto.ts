export class PlaceOrderPaymentResultDto {
  orderId: string;
  invoiceId: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentUrl: string;
  qrCode: string;
  paymentTransactionId: string;
  message: string;
}
