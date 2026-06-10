import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentMethod } from '../../services/payment.service';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PaypalPaymentPageFlowService } from '../flows/paypal-payment-page-flow.service';
import { VietQrPaymentPageFlowService } from '../flows/vietqr-payment-page-flow.service';
import { PaymentOrderSummaryService } from '../services/payment-order-summary.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import {
  ORDER_RESULT_STATE_KEY,
  OrderResultState,
} from '../../place-order/order-result/order-result-state';
import {
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';
import { VietQrPaymentFlowService } from '../flows/vietqr-payment-flow.service';

export interface PaymentPageState {
  isLoading: boolean;
  errorMessage: string;
  statusMessage: string;
  order: OrderSummary;
  cartItemCount: number;
  qrImageUrl: string;
  isVietQrSuccess: boolean;
  selectedMethod: PaymentMethod;
  paypalRedirectUrl: string;
  paypalApproved: boolean;
  paypalConfirmed: boolean;
}

const EMPTY_ORDER: OrderSummary = {
  items: [],
  subtotal: 0,
  vatRate: 0.1,
  shippingFee: 0,
  total: 0,
};

const INITIAL_STATE: PaymentPageState = {
  isLoading: false,
  errorMessage: '',
  statusMessage: '',
  order: EMPTY_ORDER,
  cartItemCount: 0,
  qrImageUrl: '',
  isVietQrSuccess: false,
  selectedMethod: 'VIETQR',
  paypalRedirectUrl: '',
  paypalApproved: false,
  paypalConfirmed: false,
};

const PAYPAL_SESSION_KEY = 'aims_paypal_payment';

@Injectable()
export class PaymentPageFacade {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly paymentService = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stateStore = inject(PaymentPageStateStore);
  private readonly vietQrPageFlow = inject(VietQrPaymentPageFlowService);

  readonly state$ = this.stateStore.state$;

  private checkoutDraft: CheckoutDraft | null = null;

  initialize(): void {
    this.checkoutDraft = this.checkoutDraftService.get();
    this.pendingPaymentSession.initialize(this.checkoutDraft);
    const paypalToken = this.route.snapshot.queryParamMap.get('token');
    const paypalCancelled =
      this.route.snapshot.queryParamMap.get('paypalCancel') === '1';

    if (this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.applyCheckoutDraft();
      this.loadInvoicePreview();
    }

    // 3. Xử lý PayPal return
    if (paypalToken) {
      this.handlePaypalReturn(paypalToken);
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
    if (method === this.state.selectedMethod) return;

    this.vietQrPageFlow.resetSelectionState();

    this.patchState({
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
    this.patchState({ errorMessage: '' });

    if (this.state.isLoading) {
      this.patchState({
        statusMessage: 'Your payment is still being prepared. Please wait.',
      });
      return;
    }

    if (this.state.selectedMethod === 'PAYPAL') {
      this.paypalPageFlow.confirm();
      return;
    }

    this.vietQrPageFlow.confirm();
  }

  cancelOrder(): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    // TODO: Implement cancel order via order service.
  }

  goToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  private handlePaypalReturn(paypalToken: string): void {
    // Restore orderId/invoiceId from sessionStorage (saved before PayPal redirect)
    const saved = this.loadPaypalSession();
    if (saved) {
      this.paypalPaymentOrderId = saved.orderId;
      this.paypalPaymentInvoiceId = saved.invoiceId;
    }

    this.patchState({
      selectedMethod: 'PAYPAL',
      paypalApproved: true,
      paypalConfirmed: false,
      statusMessage:
        'PayPal payment approved. Click "Confirm Payment" to complete your purchase.',
      errorMessage: '',
    });

    // Nếu bị mất session data (vd: user mở link ở tab khác ẩn danh hoặc localStorage bị clear),
    // KHÔNG được gọi lại startPaypalPayment() lúc này. Vì nếu checkoutDraft rỗng, gọi start sẽ
    // đẩy items: [] xuống backend -> backend gọi PayPal tạo payment amount: 0 -> lỗi 500.
    if (!this.paypalPaymentOrderId) {
      this.patchState({
        paypalApproved: false,
        errorMessage:
          'Your payment session has expired or could not be found. Please return to the product catalog and try again.',
        statusMessage: '',
      });
    }
  }

  /**
   * Captures the PayPal payment by calling the confirm API.
   * This is the step that actually charges the customer's PayPal account
   * and triggers stock decrement on the server side.
   */
  private capturePaypalPayment(): void {
    if (!this.paypalPaymentOrderId || !this.paypalPaymentInvoiceId) {
      this.patchState({
        errorMessage: 'Payment information is missing. Please try again.',
      });
      return;
    }

    const paypalOrderId = this.paypalPaymentOrderId;
    const paypalInvoiceId = this.paypalPaymentInvoiceId;

    this.patchState({
      isLoading: true,
      errorMessage: '',
      statusMessage: 'Confirming your PayPal payment...',
    });

    this.paymentService
      .confirmTransaction({
        orderId: paypalOrderId,
        invoiceId: paypalInvoiceId,
        paymentMethod: 'PAYPAL',
        transactionId: '',
        transactionContent: 'PayPal capture',
        transactionDateTime: new Date().toISOString(),
      })
      .subscribe({
        next: (result) => {
          if (!result.success || result.status !== 'SUCCESS') {
            this.patchState({
              isLoading: false,
              errorMessage:
                result.message ||
                'PayPal payment was not confirmed successfully.',
              statusMessage: '',
            });
            return;
          }

          this.saveOrderResult({
            paymentMethod: 'PAYPAL',
            status: 'SUCCESS',
            transactionId: result.transactionId || paypalOrderId,
            orderId: paypalOrderId,
            invoiceId: paypalInvoiceId,
            completedAt: new Date().toISOString(),
          });

          this.patchState({
            isLoading: false,
            paypalConfirmed: true,
            paypalApproved: false,
            statusMessage: 'Payment confirmed successfully! Redirecting...',
            errorMessage: '',
          });
          // Clear checkout draft and PayPal session since payment is completed
          this.checkoutDraftService.clear();
          this.clearPaypalSession();
          this.router.navigate(['/order-result']);
        },
        error: (err) => {
          console.error('PayPal capture error:', err);
          this.patchState({
            isLoading: false,
            errorMessage:
              err.error?.message ||
              err.message ||
              'Failed to confirm PayPal payment. Please try again.',
            statusMessage: '',
          });
        },
      });
  }

  private confirmVietQrPayment(): void {
    if (this.stateSubject.value.isVietQrSuccess) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/order-result']);
      return;
    }

    this.patchState({
      isLoading: true,
      errorMessage: '',
      statusMessage: 'Confirming your VietQR payment...',
    });

    try {
      this.vietQrPaymentFlow.confirmCurrentPayment().subscribe({
        next: (snapshot) => {
          this.applySnapshot(snapshot);

          if (snapshot.latestTransaction?.status === 'SUCCESS') {
            this.patchState({
              isLoading: false,
              statusMessage: 'Payment confirmed successfully! Redirecting...',
              errorMessage: '',
            });
            this.checkoutDraftService.clear();
            this.router.navigate(['/order-result']);
            return;
          }

          this.patchState({
            isLoading: false,
            statusMessage:
              'Payment has not been completed yet. Please try again after paying.',
          });
        },
        error: (err) => {
          console.error('VietQR confirmation error:', err);
          this.patchState({
            isLoading: false,
            errorMessage:
              err.error?.message ||
              err.message ||
              'Failed to confirm VietQR payment. Please try again.',
            statusMessage: '',
          });
        },
      });
    } catch (err) {
      const error = err as Error;
      this.patchState({
        isLoading: false,
        errorMessage:
          error.message || 'VietQR payment has not been created yet.',
        statusMessage: '',
      });
    }
  }

  private listenForVietQrUpdates(): void {
    this.snapshotSubscription = this.vietQrPaymentFlow.snapshot$.subscribe(
      (snapshot) => {
        if (!snapshot) return;

        this.applySnapshot(snapshot);
        const status = snapshot.latestTransaction?.status;

        if (status === 'FAILED' || status === 'REFUND_REQUIRED') {
          this.patchState({ errorMessage: 'Payment could not be completed.' });
        }
      },
    );
  }

  private loadInvoicePreview(): void {
    if (!this.checkoutDraft) return;

    this.orderSummary
      .previewInvoice(this.checkoutDraft, this.state.order)
      .subscribe({
        next: (order) => this.stateStore.setOrder(order),
        error: (err) => console.error('Load invoice preview failed:', err),
      });
  }

  private patchState(patch: Partial<PaymentPageState>): void {
    this.stateStore.patch(patch);
  }
}