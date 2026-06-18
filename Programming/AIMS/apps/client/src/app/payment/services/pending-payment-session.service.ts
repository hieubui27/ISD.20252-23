import { Injectable, inject } from '@angular/core';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PlaceOrderApiService } from '../../place-order/services/place-order-api.service';
import { PAYMENT_METHOD } from '../constants/payment.constants';
import { PendingPaymentSession } from '../models/payment-session.models';
import { PaymentSessionStorageService } from './payment-session-storage.service';

@Injectable()
export class PendingPaymentSessionService {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly paymentSessionStorage = inject(PaymentSessionStorageService);

  private checkoutDraft: CheckoutDraft | null = null;
  private pendingPaymentSession: PendingPaymentSession | null = null;
  private pendingPaymentSessionPromise: Promise<PendingPaymentSession> | null =
    null;
  private pendingVietQrPayment: PlaceOrderPaymentResult | null = null;

  initialize(draft: CheckoutDraft | null): PendingPaymentSession | null {
    this.checkoutDraft = draft;
    this.pendingPaymentSession =
      this.paymentSessionStorage.loadPendingPaymentSession(draft);
    return this.pendingPaymentSession;
  }

  get session(): PendingPaymentSession | null {
    return this.pendingPaymentSession;
  }

  get vietQrPaymentToResume(): PlaceOrderPaymentResult | null {
    return this.pendingVietQrPayment;
  }

  consumeVietQrPaymentToResume(): PlaceOrderPaymentResult | null {
    const payment = this.pendingVietQrPayment;
    this.pendingVietQrPayment = null;
    return payment;
  }

  ensure(): Promise<PendingPaymentSession> {
    if (this.pendingPaymentSession) {
      return Promise.resolve(this.pendingPaymentSession);
    }

    if (this.pendingPaymentSessionPromise) {
      return this.pendingPaymentSessionPromise;
    }

    if (!this.checkoutDraft) {
      return Promise.reject(
        new Error('Checkout draft is required to create payment.'),
      );
    }

    const checkoutDraft = this.checkoutDraft;

    this.pendingPaymentSessionPromise = new Promise((resolve, reject) => {
      this.placeOrderApi
        .createPayment({
          items: this.checkoutDraftService.toPlaceOrderItems(checkoutDraft),
          deliveryInfo: checkoutDraft.deliveryInfo,
          paymentMethod: PAYMENT_METHOD.VIETQR,
        })
        .subscribe({
          next: (payment) => {
            const session = this.saveFromPayment(payment);
            this.pendingVietQrPayment = payment;
            this.pendingPaymentSessionPromise = null;

            if (!session) {
              reject(new Error('Unable to save pending payment session.'));
              return;
            }

            resolve(session);
          },
          error: (err) => {
            this.pendingPaymentSessionPromise = null;
            reject(err);
          },
        });
    });

    return this.pendingPaymentSessionPromise;
  }

  saveFromPayment(
    payment: PlaceOrderPaymentResult,
  ): PendingPaymentSession | null {
    const customerEmail =
      this.pendingPaymentSession?.customerEmail ||
      this.checkoutDraft?.deliveryInfo.email?.trim() ||
      '';

    if (!customerEmail) return null;

    this.pendingPaymentSession = {
      orderId: payment.orderId,
      invoiceId: payment.invoiceId,
      totalAmount: payment.totalAmount,
      customerEmail,
      checkoutKey: this.paymentSessionStorage.buildCheckoutKey(
        this.checkoutDraft,
      ),
      paymentTransactionId: payment.paymentTransactionId,
    };

    this.paymentSessionStorage.savePendingPaymentSession(
      this.pendingPaymentSession,
    );

    return this.pendingPaymentSession;
  }

  clear(): void {
    this.pendingPaymentSession = null;
    this.pendingPaymentSessionPromise = null;
    this.pendingVietQrPayment = null;
    this.paymentSessionStorage.clearPendingPaymentSession();
  }
}
