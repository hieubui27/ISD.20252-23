import { PaymentMethod } from '../constants/payment.constants';

/**
 * Port: PaymentGateway
 *
 * SOLID Review:
 * SRP: Satisfied. The port describes the contract every payment gateway must follow.
 * OCP: Satisfied. New providers can be added by implementing these interfaces.
 * LSP: Satisfied. Gateway adapters can replace each other through the same contracts.
 * ISP: Satisfied. Creation, confirmation, and refund capabilities are split.
 * DIP: Satisfied. PaymentService depends on the port instead of concrete providers.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The port exchanges DTOs and primitives, and every method belongs to
 *   the payment gateway lifecycle.
 */

// Common data needed to create a payment with an external gateway.
export interface PaymentGatewayContext {
  /** Internal transaction reference used by the gateway. */
  gatewayOrderId: string;
  /** Original amount in VND. */
  amount: number;
  /** Payment description sent to the provider. */
  description: string;
  /** Redirect URL after successful payment. */
  returnUrl?: string;
  /** Redirect URL after cancellation. */
  cancelUrl?: string;
  /** Customer email. */
  customerEmail?: string;
  /** Invoice ID. */
  invoiceId?: string;
}

// Unified payment result returned by every gateway.
export interface PaymentGatewayResult {
  /** Payment URL, such as PayPal approval link or VietQR link. */
  paymentUrl: string;
  /** QR value for VietQR. PayPal leaves this empty. */
  qrCode: string;
  /** Provider data that can be stored when needed. */
  providerData?: Record<string, unknown>;
  /** PaymentTransaction fields to update after provider response. */
  transactionUpdate?: Record<string, unknown>;
}

// NestJS token for gateway adapter injection.
export const PAYMENT_GATEWAYS = 'PAYMENT_GATEWAYS';

// Base interface implemented by every payment provider adapter.
export interface PaymentGatewayBase {
  /**
   * Returns the payment method handled by this adapter.
   * The factory uses it to register and find the right adapter.
   */
  getMethod(): PaymentMethod;
}

export interface PaymentCreationGateway extends PaymentGatewayBase {
  /**
   * Creates a payment request with the external provider.
   * - PayPal calls createOrder() and returns an approval URL.
   * - VietQR calls generateQrCode() and returns QR data.
   */
  createPayment(context: PaymentGatewayContext): Promise<PaymentGatewayResult>;
}

export interface PaymentConfirmationGateway extends PaymentGatewayBase {
  /**
   * Confirms a payment after the customer approves it.
   * - PayPal captures the order.
   * - VietQR is completed by callback, so it does not use this flow.
   */
  confirmPayment(transactionRef: string): Promise<PaymentGatewayResult>;
}

export interface PaymentRefundGateway extends PaymentGatewayBase {
  /**
   * Refunds a paid transaction when the provider supports automatic refunds.
   * VietQR refunds are marked for manual handling.
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
