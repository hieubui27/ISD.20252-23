import { Injectable } from '@angular/core';
import { CheckoutDraft } from '../../place-order/services/checkout-draft.service';
import {
  PaypalPaymentSession,
  PendingPaymentSession,
} from '../models/payment-session.models';

const PAYPAL_SESSION_KEY = 'aims_paypal_payment';
const PENDING_PAYMENT_SESSION_KEY = 'aims.pendingPaymentSession';

@Injectable({ providedIn: 'root' })
export class PaymentSessionStorageService {
  savePaypalSession(orderId: string, invoiceId: string): void {
    try {
      sessionStorage.setItem(
        PAYPAL_SESSION_KEY,
        JSON.stringify({ orderId, invoiceId }),
      );
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }

  loadPaypalSession(): PaypalPaymentSession | null {
    try {
      const raw = sessionStorage.getItem(PAYPAL_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PaypalPaymentSession>;
      if (parsed?.orderId && parsed?.invoiceId) {
        return {
          orderId: parsed.orderId,
          invoiceId: parsed.invoiceId,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  clearPaypalSession(): void {
    try {
      sessionStorage.removeItem(PAYPAL_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  savePendingPaymentSession(session: PendingPaymentSession): void {
    try {
      sessionStorage.setItem(
        PENDING_PAYMENT_SESSION_KEY,
        JSON.stringify(session),
      );
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }

  loadPendingPaymentSession(
    draft: CheckoutDraft | null,
  ): PendingPaymentSession | null {
    try {
      const raw = sessionStorage.getItem(PENDING_PAYMENT_SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<PendingPaymentSession>;
      const checkoutKey = this.buildCheckoutKey(draft);
      if (
        parsed?.orderId &&
        parsed?.invoiceId &&
        Number.isFinite(parsed?.totalAmount) &&
        parsed?.customerEmail &&
        parsed?.checkoutKey === checkoutKey
      ) {
        return parsed as PendingPaymentSession;
      }

      this.clearPendingPaymentSession();
      return null;
    } catch {
      return null;
    }
  }

  clearPendingPaymentSession(): void {
    try {
      sessionStorage.removeItem(PENDING_PAYMENT_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  buildCheckoutKey(draft: CheckoutDraft | null): string {
    if (!draft) return '';

    const items = [...draft.items]
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.productId - b.productId);

    const deliveryInfo = draft.deliveryInfo;

    return JSON.stringify({
      items,
      deliveryInfo: {
        receiverName: deliveryInfo.receiverName.trim(),
        phoneNumber: deliveryInfo.phoneNumber.trim(),
        province: deliveryInfo.province.trim(),
        streetAddress: deliveryInfo.streetAddress.trim(),
        email: deliveryInfo.email.trim().toLowerCase(),
        shippingInstructions:
          deliveryInfo.shippingInstructions?.trim() || '',
      },
    });
  }
}
