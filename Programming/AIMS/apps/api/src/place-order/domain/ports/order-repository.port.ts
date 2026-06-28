export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface ProductSnapshot {
  id: number;
  title: string;
  currentPrice: number;
  weightGrams: number;
  quantity: number;
  status: string;
}

export interface PaymentTransactionSnapshot {
  orderId: string;
  transactionId: string | null;
  transactionContent: string | null;
  transactionDateTime: Date | null;
  createdAt: Date;
}

export interface PersistedOrderLine {
  productId: number;
  quantity: number;
  price: number;
  title?: string;
  weightGrams?: number;
}

export interface PersistedInvoice {
  id: string;
  vatSubtotal: number;
  totalAmount: number;
}

export interface PersistedOrderDetail {
  orderId: string;
  status: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  province: string;
  subtotal: number;
  deliveryFee: number;
  invoice: PersistedInvoice | null;
  lines: PersistedOrderLine[];
}

export interface OrderLineInput {
  productId: number;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  orderCode: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  province: string;
  deliveryMethod: string;
  deliveryFee: number;
  subtotal: number;
  vatSubtotal: number;
  totalAmount: number;
  status: string;
  lines: OrderLineInput[];
}

export interface ConfirmedPaymentInput {
  paymentMethod: string;
  provider: string;
  amount: number;
  status: string;
  transactionId: string;
  transactionContent: string;
  transactionDateTime: Date;
}

export interface CreatedOrderRef {
  orderId: string;
  invoiceId: string;
  totalAmount: number;
}

export interface IOrderRepository {
  findProductsByIds(productIds: number[]): Promise<ProductSnapshot[]>;
  findPaymentTransactionByTransactionId(
    transactionId: string,
  ): Promise<PaymentTransactionSnapshot | null>;
  findOrderDetailByOrderId(
    orderId: string,
  ): Promise<PersistedOrderDetail | null>;
  createPendingPaymentOrder(input: CreateOrderInput): Promise<CreatedOrderRef>;
  createConfirmedOrder(
    input: CreateOrderInput,
    payment: ConfirmedPaymentInput,
  ): Promise<void>;
  applyPaidTransition(orderId: string): Promise<PersistedOrderDetail>;
}
