import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import { PaymentResultDto } from '../../services/payment.service';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/payment.constants';
import {
  PaypalPaymentSession,
  PendingPaymentSession,
} from '../models/payment-session.models';
import { PaymentCompletionService } from '../services/payment-completion.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { PaymentStatusApiService } from '../services/payment-status-api.service';
import { readPaymentErrorMessage } from '../services/payment-result.utils';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';
import { PaypalPaymentFlowService } from './paypal-payment-flow.service';

const PAYPAL_APPROVED_MESSAGE =
  'PayPal payment approved. Confirming your payment...';

@Injectable()
export class PaypalPaymentPageFlowService {
  private readonly paymentCompletion = inject(PaymentCompletionService);
  private readonly paypalPaymentFlow = inject(PaypalPaymentFlowService);
  private readonly paymentStatusApi = inject(PaymentStatusApiService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly router = inject(Router);
  private readonly stateStore = inject(PaymentPageStateStore);

  private paypalPaymentSession: PaypalPaymentSession | null = null;
  private paymentExpiredHandler?: () => void;
  private isHandlingExpiredPayment = false;

  onPaymentExpired(handler: () => void): void {
    this.paymentExpiredHandler = handler;
  }

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
      selectedMethod: PAYMENT_METHOD.PAYPAL,
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
      return;
    }

    this.capture();
  }

  discardApprovalSession(): void {
    this.paypalPaymentSession = null;
    this.paypalPaymentFlow.clearSession();
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
      this.redirectIfPaymentIsStillPending(paypalUrl);
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
    if (this.stateStore.snapshot.selectedMethod !== PAYMENT_METHOD.PAYPAL) {
      return;
    }

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

    this.paymentStatusApi
      .getLatestByOrderId(paymentSession.orderId, PAYMENT_METHOD.PAYPAL)
      .pipe(
        switchMap((transaction) => {
          if (transaction.status === PAYMENT_STATUS.FAILED) {
            return of(null);
          }

          return this.paypalPaymentFlow.capture(paymentSession).pipe(
            catchError((err) =>
              this.paymentStatusApi
                .getLatestByOrderId(
                  paymentSession.orderId,
                  PAYMENT_METHOD.PAYPAL,
                )
                .pipe(
                  switchMap((latestTransaction) => {
                    if (latestTransaction.status === PAYMENT_STATUS.FAILED) {
                      return of(null);
                    }

                    throw err;
                  }),
                ),
            ),
          );
        }),
      )
      .subscribe({
      next: (result) => this.handleCaptureResult(paymentSession, result),
      error: (err) => this.handleCaptureError(err),
    });
  }

  private redirectIfPaymentIsStillPending(paypalUrl: string): void {
    const session = this.pendingPaymentSession.session;

    if (!session?.orderId) {
      window.location.href = paypalUrl;
      return;
    }

    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage: 'Checking your PayPal payment...',
    });

    this.paymentStatusApi
      .getLatestByOrderId(session.orderId, PAYMENT_METHOD.PAYPAL)
      .subscribe({
        next: (transaction) => {
          if (transaction.status === PAYMENT_STATUS.FAILED) {
            this.handleExpiredPayment();
            return;
          }

          window.location.href = paypalUrl;
        },
        error: (err) => {
          console.error('PayPal status check failed:', err);
          this.stateStore.patch({
            isLoading: false,
            errorMessage: readPaymentErrorMessage(
              err,
              'Unable to check PayPal payment status.',
            ),
            statusMessage: '',
          });
        },
      });
  }

  private handleCaptureResult(
    paymentSession: PaypalPaymentSession,
    result: PaymentResultDto | null,
  ): void {
    if (!result) {
      this.handleExpiredPayment();
      return;
    }

    if (!result.success || result.status !== PAYMENT_STATUS.SUCCESS) {
      this.handleCaptureFailed(result);
      return;
    }

    this.finishSuccessfulPayment(paymentSession, result);
  }

  private handleCaptureFailed(result: PaymentResultDto): void {
    this.stateStore.patch({
      isLoading: false,
      errorMessage:
        result.message || 'PayPal payment was not confirmed successfully.',
      statusMessage: '',
    });
  }

  private finishSuccessfulPayment(
    paymentSession: PaypalPaymentSession,
    result: PaymentResultDto,
  ): void {
    this.paymentCompletion.complete(
      {
        paymentMethod: PAYMENT_METHOD.PAYPAL,
        status: PAYMENT_STATUS.SUCCESS,
        transactionId: result.transactionId || paymentSession.orderId,
        orderId: paymentSession.orderId,
        invoiceId: paymentSession.invoiceId,
        completedAt: new Date().toISOString(),
      },
      () => this.paypalPaymentFlow.clearSession(),
      () =>
        this.stateStore.patch({
          isLoading: false,
          paypalConfirmed: true,
          paypalApproved: false,
          statusMessage: 'Payment confirmed successfully! Redirecting...',
          errorMessage: '',
        }),
    );
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

  private handleExpiredPayment(): void {
    if (this.isHandlingExpiredPayment) return;

    this.isHandlingExpiredPayment = true;
    this.stateStore.patch({
      isLoading: false,
      paypalApproved: false,
      statusMessage:
        'The PayPal payment has expired. This order will be cancelled and you will be returned to your cart.',
      errorMessage: '',
    });

    window.setTimeout(() => this.paymentExpiredHandler?.(), 1800);
  }
}
