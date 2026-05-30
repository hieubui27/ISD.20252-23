import { PaymentMethod } from '../../services/payment.service';

export interface PlaceOrderCartItem {
  productId: number;
  quantity: number;
}

export interface PlaceOrderDeliveryInfo {
  receiverName: string;
  phoneNumber: string;
  province: string;
  streetAddress: string;
  email: string;
  shippingInstructions?: string;
}

export interface InvoicePreviewItem {
  productId: number;
  title?: string;
  price: number;
  quantity: number;
  amount: number;
  weight?: number;
}

export interface InvoicePreview {
  items: InvoicePreviewItem[];
  subtotalBeforeVat: number;
  vatAmount: number;
  subtotalAfterVat: number;
  deliveryFee: number;
  totalAmount: number;
}

export interface PlaceOrderPaymentRequest {
  items: PlaceOrderCartItem[];
  deliveryInfo: PlaceOrderDeliveryInfo;
  paymentMethod: PaymentMethod;
}

export interface PlaceOrderPaymentResult {
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
