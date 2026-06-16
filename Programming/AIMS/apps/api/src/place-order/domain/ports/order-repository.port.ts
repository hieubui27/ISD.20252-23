/**
 * Repository port – the single abstraction the place-order domain uses to talk
 * to persistence. Every Prisma call lives behind this interface.
 *
 * Coupling: Data Coupling – only plain read-models / inputs cross the boundary;
 *   Prisma Decimal/BigInt are normalised to number/string here.
 * Cohesion: Functional Cohesion – all methods serve order persistence.
 * DIP: high-level services depend on this interface, not on PrismaService.
 */
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

/** Read-model of a product, normalised away from Prisma types. */
export interface ProductSnapshot {
  id: number;
  title: string;
  currentPrice: number;
  /** Weight as stored in DB (grams). */
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
  /** Creates an order awaiting payment (no stock decrement). */
  createPendingPaymentOrder(input: CreateOrderInput): Promise<CreatedOrderRef>;
  /** Creates an already-paid order, decrements stock and records the payment, atomically. */
  createConfirmedOrder(
    input: CreateOrderInput,
    payment: ConfirmedPaymentInput,
  ): Promise<void>;
  /** Moves an existing PENDING_PAYMENT order to PENDING_PROCESSING and decrements stock atomically. */
  applyPaidTransition(orderId: string): Promise<PersistedOrderDetail>;
}
