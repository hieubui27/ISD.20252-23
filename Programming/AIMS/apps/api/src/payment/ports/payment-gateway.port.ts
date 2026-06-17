import { PaymentMethod } from '../constants/payment.constants';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This port defines the payment gateway contract using only DTOs and primitives.
 * - Concrete adapters (PayPal, VietQR, etc.) implement this interface independently.
 *
 * Cohesion reason:
 * - All methods belong to the payment gateway lifecycle: create, confirm, and refund.
 */

// ── Input: Thông tin chung cần để tạo thanh toán ──
export interface PaymentGatewayContext {
  /** ID giao dịch nội bộ dùng cho gateway (đã normalize) */
  gatewayOrderId: string;
  /** Số tiền gốc (VND) */
  amount: number;
  /** Mô tả giao dịch */
  description: string;
  /** URL redirect sau khi thanh toán xong */
  returnUrl?: string;
  /** URL redirect khi hủy */
  cancelUrl?: string;
  /** Email khách hàng */
  customerEmail?: string;
  /** Invoice ID */
  invoiceId?: string;
}

// ── Output: Kết quả trả về thống nhất từ mọi gateway ──
export interface PaymentGatewayResult {
  /** URL thanh toán (PayPal approval link, hoặc VietQR link) */
  paymentUrl: string;
  /** Mã QR (chỉ VietQR có, PayPal để rỗng) */
  qrCode: string;
  /** Dữ liệu bổ sung từ provider, dùng để lưu vào DB nếu cần */
  providerData?: Record<string, unknown>;
  /** Dữ liệu cần cập nhật vào payment transaction sau khi provider trả kết quả */
  transactionUpdate?: Record<string, unknown>;
}

// ── Token cho NestJS DI ──
export const PAYMENT_GATEWAYS = 'PAYMENT_GATEWAYS';

// ── Interface chính mà mọi payment provider phải implement ──
export interface PaymentGatewayBase {
  /**
   * Trả về phương thức thanh toán mà adapter này xử lý.
   * Factory dùng giá trị này để đăng ký và tra cứu đúng adapter.
   */
  getMethod(): PaymentMethod;
}

export interface PaymentCreationGateway extends PaymentGatewayBase {
  /**
   * Tạo một yêu cầu thanh toán mới với provider bên ngoài.
   * - PayPal: gọi createOrder() → trả approvalUrl
   * - VietQR: gọi generateQrCode() → trả qrCode + qrLink
   */
  createPayment(context: PaymentGatewayContext): Promise<PaymentGatewayResult>;
}

export interface PaymentConfirmationGateway extends PaymentGatewayBase {
  /**
   * Xác nhận (capture) thanh toán sau khi khách hàng đã approve.
   * - PayPal: gọi capturePayment(orderId)
   * - VietQR: không implement, callback tự động xử lý success
   */
  confirmPayment(transactionRef: string): Promise<PaymentGatewayResult>;
}

export interface PaymentRefundGateway extends PaymentGatewayBase {
  /**
   * Hoàn tiền cho một giao dịch đã thanh toán.
   * - PayPal: gọi refundPayment(captureId)
   * - VietQR: không implement, payment chung sẽ đánh dấu cần hoàn thủ công
   */
  refundPayment(
    transactionRef: string,
    amount: number,
  ): Promise<PaymentGatewayResult>;
}

export type PaymentGateway =
  | PaymentCreationGateway
  | (PaymentCreationGateway & PaymentConfirmationGateway)
  | (PaymentCreationGateway & PaymentRefundGateway)
  | (PaymentCreationGateway &
      PaymentConfirmationGateway &
      PaymentRefundGateway);
