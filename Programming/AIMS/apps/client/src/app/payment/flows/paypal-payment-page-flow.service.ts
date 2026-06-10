import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import { CheckoutDraftService } from '../../place-order/services/checkout-draft.service';
import { PaymentResultDto } from '../../services/payment.service';
import {
  PaypalPaymentSession,
  PendingPaymentSession,
} from '../models/payment-session.models';
import { OrderResultStorageService } from '../services/order-result-storage.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { readPaymentErrorMessage } from '../services/payment-result.utils';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';
import { PaypalPaymentFlowService } from './paypal-payment-flow.service';

const PAYPAL_APPROVED_MESSAGE =
  'PayPal payment approved. Click "Confirm Payment" to complete your purchase.';

@Injectable()
export class PaypalPaymentPageFlowService {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly orderResultStorage = inject(OrderResultStorageService);
  private readonly paypalPaymentFlow = inject(PaypalPaymentFlowService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly router = inject(Router);
  private readonly stateStore = inject(PaymentPageStateStore);

  private paypalPaymentSession: PaypalPaymentSession | null = null;

  start(hasCheckoutDraft: boolean): void {
    if (!hasCheckoutDraft && !this.pendingPaymentSession.session) return;

    this.prepareStart();

    this.pendingPaymentSession
      .ensure()
      .then((session) => this.startWhenSessionIsReady(session))
      .catch((err) => this.handleStartError(err));
  }

  handleReturn(): void {
    const saved = this.paypalPaymentFlow.loadSession();
    if (saved) {
      this.paypalPaymentSession = saved;
    }

    this.stateStore.patch({
      selectedMethod: 'PAYPAL',
      paypalApproved: true,
      paypalConfirmed: false,
      statusMessage: PAYPAL_APPROVED_MESSAGE,
      errorMessage: '',
    });

    if (!this.paypalPaymentSession?.orderId) {
      this.stateStore.patch({
        paypalApproved: false,
        errorMessage:
          'Your payment session has expired or could not be found. Please return to the product catalog and try again.',
        statusMessage: '',
      });
    }
  }

  confirm(): void {
    if (this.stateStore.snapshot.paypalApproved) {
      this.capture();
      return;
    }

    if (this.stateStore.snapshot.paypalConfirmed) {
      this.router.navigate(['/order-result']);
      return;
    }

    const paypalUrl = this.stateStore.snapshot.paypalRedirectUrl;
    if (paypalUrl) {
      window.location.href = paypalUrl;
    } else {
      this.stateStore.patch({
        statusMessage: 'PayPal redirect URL is not available yet.',
      });
    }
  }

  private prepareStart(): void {
    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage: '',
      paypalRedirectUrl: '',
    });
  }

  private startWhenSessionIsReady(session: PendingPaymentSession): void {
    if (this.stateStore.snapshot.selectedMethod !== 'PAYPAL') return;

    this.paypalPaymentFlow.createOrReusePayment(session).subscribe({
      next: (result) => this.handlePaymentCreated(result),
      error: (err) => this.handleStartError(err),
    });
  }

  private handlePaymentCreated(result: PlaceOrderPaymentResult): void {
    this.pendingPaymentSession.saveFromPayment(result);
    this.paypalPaymentSession = {
      orderId: result.orderId,
      invoiceId: result.invoiceId,
    };
    this.paypalPaymentFlow.saveSession(result.orderId, result.invoiceId);

    const redirectUrl = result.paymentUrl || '';
    this.stateStore.patch({
      isLoading: false,
      paypalRedirectUrl: redirectUrl,
      statusMessage: this.buildCreatedPaymentMessage(redirectUrl),
    });
  }

  private buildCreatedPaymentMessage(redirectUrl: string): string {
    if (!redirectUrl) return 'PayPal payment created. Awaiting redirect URL.';
    return this.stateStore.snapshot.paypalApproved
      ? PAYPAL_APPROVED_MESSAGE
      : '';
  }

  private handleStartError(err: unknown): void {
    console.error('PayPal payment error:', err);
    this.stateStore.patch({
      isLoading: false,
      errorMessage: readPaymentErrorMessage(
        err,
        'Unable to create PayPal payment request.',
      ),
    });
  }

  private capture(): void {
    const paymentSession = this.paypalPaymentSession;

    if (!paymentSession?.orderId || !paymentSession.invoiceId) {
      this.stateStore.patch({
        errorMessage: 'Payment information is missing. Please try again.',
      });
      return;
    }

    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage: 'Confirming your PayPal payment...',
    });

    this.paypalPaymentFlow.capture(paymentSession).subscribe({
      next: (result) => this.handleCaptureResult(paymentSession, result),
      error: (err) => this.handleCaptureError(err),
    });
  }

  private handleCaptureResult(
    paymentSession: PaypalPaymentSession,
    result: PaymentResultDto,
  ): void {
    if (!result.success || result.status !== 'SUCCESS') {
      this.handleCaptureFailed(result);
      return;
    }

    this.saveOrderResult(paymentSession, result);
    this.finishSuccessfulPayment();
  }

  private handleCaptureFailed(result: PaymentResultDto): void {
    this.stateStore.patch({
      isLoading: false,
      errorMessage:
        result.message || 'PayPal payment was not confirmed successfully.',
      statusMessage: '',
    });
  }

  private saveOrderResult(
    paymentSession: PaypalPaymentSession,
    result: PaymentResultDto,
  ): void {
    this.orderResultStorage.save({
      paymentMethod: 'PAYPAL',
      status: 'SUCCESS',
      transactionId: result.transactionId || paymentSession.orderId,
      orderId: paymentSession.orderId,
      invoiceId: paymentSession.invoiceId,
      completedAt: new Date().toISOString(),
    });
  }

  private finishSuccessfulPayment(): void {
    this.stateStore.patch({
      isLoading: false,
      paypalConfirmed: true,
      paypalApproved: false,
      statusMessage: 'Payment confirmed successfully! Redirecting...',
      errorMessage: '',
    });
    this.checkoutDraftService.clear();
    this.paypalPaymentFlow.clearSession();
    this.pendingPaymentSession.clear();
    this.router.navigate(['/order-result']);
  }

  private handleCaptureError(err: unknown): void {
    console.error('PayPal capture error:', err);
    this.stateStore.patch({
      isLoading: false,
      errorMessage: readPaymentErrorMessage(
        err,
        'Failed to confirm PayPal payment. Please try again.',
      ),
      statusMessage: '',
    });
  }
}
