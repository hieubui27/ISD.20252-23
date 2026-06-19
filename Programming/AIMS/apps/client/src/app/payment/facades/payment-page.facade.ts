import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentMethod, PaymentService } from '../../services/payment.service';
import { PAYMENT_METHOD } from '../constants/payment.constants';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PaypalPaymentPageFlowService } from '../flows/paypal-payment-page-flow.service';
import { VietQrPaymentPageFlowService } from '../flows/vietqr-payment-page-flow.service';
import { PaymentOrderSummaryService } from '../services/payment-order-summary.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';

@Injectable()
export class PaymentPageFacade {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly orderSummary = inject(PaymentOrderSummaryService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly paypalPageFlow = inject(PaypalPaymentPageFlowService);
  private readonly paymentService = inject(PaymentService);
  private readonly vietQrPageFlow = inject(VietQrPaymentPageFlowService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly stateStore = inject(PaymentPageStateStore);

  readonly state$ = this.stateStore.state$;

  private checkoutDraft: CheckoutDraft | null = null;

  initialize(): void {
    this.vietQrPageFlow.onPaymentExpired(() => this.handlePaymentExpired());
    this.paypalPageFlow.onPaymentExpired(() => this.handlePaymentExpired());
    this.checkoutDraft = this.checkoutDraftService.get();
    this.pendingPaymentSession.initialize(this.checkoutDraft);

    const paypalToken = this.route.snapshot.queryParamMap.get('token');
    const paypalCancelled =
      this.route.snapshot.queryParamMap.get('paypalCancel') === '1';

    if (this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.applyCheckoutDraft();
      this.loadInvoicePreview();
    }

    if (paypalCancelled) {
      this.handlePaypalCancelReturn();
      return;
    }

    if (paypalToken) {
      this.paypalPageFlow.handleReturn();
      return;
    }

    if (!this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/product-catalog']);
      return;
    }

    if (this.vietQrPageFlow.resumeCurrentPaymentIfMatchesPendingSession()) {
      return;
    }

    this.startPaymentFlow();
  }

  destroy(): void {
    this.vietQrPageFlow.destroy();
  }

  selectPaymentMethod(method: PaymentMethod): void {
    if (method === this.stateStore.snapshot.selectedMethod) return;

    this.vietQrPageFlow.resetSelectionState();

    this.stateStore.patch({
      selectedMethod: method,
      isLoading: false,
      errorMessage: '',
      statusMessage: '',
      qrImageUrl: '',
      isVietQrSuccess: false,
      paypalRedirectUrl: '',
      paypalApproved: false,
      paypalConfirmed: false,
    });

    this.startPaymentFlow();
  }

  confirmOrder(): void {
    this.stateStore.patch({ errorMessage: '' });

    if (this.stateStore.snapshot.isLoading) {
      this.stateStore.patch({
        statusMessage: 'Your payment is still being prepared. Please wait.',
      });
      return;
    }

    if (this.stateStore.snapshot.selectedMethod === PAYMENT_METHOD.PAYPAL) {
      this.paypalPageFlow.confirm();
      return;
    }

    this.vietQrPageFlow.confirm();
  }

  cancelOrder(): void {
    this.vietQrPageFlow.resetSelectionState();
    this.paypalPageFlow.discardApprovalSession();
    this.cancelCurrentOrderAndReturnToCart();
  }

  private cancelCurrentOrderAndReturnToCart(): void {
    const transactionId =
      this.pendingPaymentSession.session?.paymentTransactionId;

    if (!transactionId) {
      this.finishCancelOrder();
      return;
    }

    this.paymentService.cancelTransaction(transactionId).subscribe({
      next: () => this.finishCancelOrder(),
      error: (err) => {
        console.error('Cancel order failed:', err);
        this.finishCancelOrder();
      },
    });
  }

  private handlePaymentExpired(): void {
    this.paypalPageFlow.discardApprovalSession();
    this.cancelCurrentOrderAndReturnToCart();
  }

  goToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  private startPaymentFlow(): void {
    if (this.stateStore.snapshot.selectedMethod === PAYMENT_METHOD.VIETQR) {
      this.vietQrPageFlow.start();
      return;
    }

    this.paypalPageFlow.start(
      this.checkoutDraftService.hasValidItems(this.checkoutDraft),
    );
  }

  private handlePaypalCancelReturn(): void {
    this.paypalPageFlow.discardApprovalSession();

    this.stateStore.patch({
      selectedMethod: PAYMENT_METHOD.VIETQR,
      paypalApproved: false,
      paypalConfirmed: false,
      paypalRedirectUrl: '',
      errorMessage: '',
      statusMessage:
        'PayPal payment was cancelled. Creating a new VietQR payment...',
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        paypalCancel: null,
        token: null,
        PayerID: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.vietQrPageFlow.startFresh(
      'PayPal payment was cancelled. Creating a new VietQR payment...',
    );
  }

  private finishCancelOrder(): void {
    this.pendingPaymentSession.clear();
    this.router.navigate(['/cart']);
  }

  private applyCheckoutDraft(): void {
    if (!this.checkoutDraft) return;

    this.stateStore.setOrder(
      this.orderSummary.fromCheckoutDraft(this.checkoutDraft),
    );
  }

  private loadInvoicePreview(): void {
    if (!this.checkoutDraft) return;

    this.orderSummary
      .previewInvoice(this.checkoutDraft, this.stateStore.snapshot.order)
      .subscribe({
        next: (order) => this.stateStore.setOrder(order),
        error: (err) => console.error('Load invoice preview failed:', err),
      });
  }
}
