import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, map } from 'rxjs';
import * as QRCode from 'qrcode';
import {
  OrderSummary,
  PaymentResultDto,
  PaymentMethod,
  PaymentService,
} from '../../services/payment.service';
import {
  InvoicePreview,
  PlaceOrderPaymentResult,
} from '../../place-order/models/place-order.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PlaceOrderApiService } from '../../place-order/services/place-order-api.service';
import {
  ORDER_RESULT_STATE_KEY,
  OrderResultState,
} from '../../place-order/order-result/order-result-state';
import {
  ExistingPaymentContext,
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';
import { VietQrPaymentFlowService } from '../flows/vietqr-payment-flow.service';
import { CartStoreService } from '../../cart/services/cart-store.service';

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
const PENDING_PAYMENT_SESSION_KEY = 'aims.pendingPaymentSession';

interface PendingPaymentSession extends ExistingPaymentContext {
  checkoutKey: string;
}

@Injectable()
/**
 * SOLID review:
 * - SRP: Medium risk. As a page facade it is allowed to coordinate UI workflows,
 *   but it currently combines checkout draft validation, invoice preview loading,
 *   VietQR payment flow, router navigation, state mutation, and QR image generation.
 * - DIP: Low risk. It depends directly on the concrete qrcode library and concrete
 *   Angular services instead of a QR image generator abstraction and smaller
 *   page-use-case services.
 * - Improvement: Extract QrImageService, PaymentPageStateStore, and
 *   InvoicePreviewFacade. Keep this facade focused on composing page-level
 *   interactions.
 */
export class PaymentPageFacade {
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly paymentService = inject(PaymentService);
  private readonly cartStore = inject(CartStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly stateSubject = new BehaviorSubject<PaymentPageState>({
    ...INITIAL_STATE,
    order: { ...EMPTY_ORDER, items: [] },
  });
  readonly state$ = this.stateSubject.asObservable();

  private snapshotSubscription?: Subscription;
  private checkoutDraft: CheckoutDraft | null = null;
  private currentSnapshot: VietQrPaymentSnapshot | null = null;
  private paypalPaymentOrderId: string | null = null;
  private paypalPaymentInvoiceId: string | null = null;
  private pendingPaymentSession: PendingPaymentSession | null = null;
  private pendingPaymentSessionPromise: Promise<PendingPaymentSession> | null =
    null;
  private pendingVietQrPayment: PlaceOrderPaymentResult | null = null;

  initialize(): void {
    this.checkoutDraft = this.checkoutDraftService.get();
    this.pendingPaymentSession = this.loadPendingPaymentSession(
      this.checkoutDraft,
    );
    const paypalToken = this.route.snapshot.queryParamMap.get('token');
    const paypalCancelled =
      this.route.snapshot.queryParamMap.get('paypalCancel') === '1';

    if (this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.applyCheckoutDraft(this.checkoutDraft);
      this.loadInvoicePreview(this.checkoutDraft);
    }

    // 3. Xử lý PayPal return
    if (paypalCancelled) {
      this.handlePaypalCancelReturn();
      return;
    }

    if (paypalToken) {
      this.handlePaypalReturn();
      return;
    }

    // 1. Kiểm tra giỏ hàng có hợp lệ không
    // Nếu đang return từ PayPal, ta có thể không cần block nếu giỏ hàng lỡ bị xóa (vì order đã ở backend)
    // Nhưng nếu không phải PayPal return mà giỏ hàng trống thì phải redirect
    if (
      !paypalToken &&
      !this.checkoutDraftService.hasValidItems(this.checkoutDraft)
    ) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/product-catalog']);
      return;
    }

    // 2. Apply CheckoutDraft để UI hiển thị thông tin giỏ hàng/tổng tiền thay vì 0 VND

    // Detect VietQR return:
    const existingSnapshot = this.vietQrPaymentFlow.currentSnapshot;
    if (
      existingSnapshot &&
      this.pendingPaymentSession &&
      existingSnapshot.payment.orderId === this.pendingPaymentSession.orderId
    ) {
      this.vietQrPaymentFlow.resume(existingSnapshot);
      this.listenForVietQrUpdates();
      this.applySnapshot(existingSnapshot);
      return;
    }
    if (existingSnapshot) {
      this.vietQrPaymentFlow.clearSnapshot();
    }

    this.startPaymentFlow();
  }

  destroy(): void {
    this.snapshotSubscription?.unsubscribe();
    this.vietQrPaymentFlow.stop();
  }

  selectPaymentMethod(method: PaymentMethod): void {
    if (method === this.stateSubject.value.selectedMethod) return;

    this.vietQrPaymentFlow.stop();
    this.snapshotSubscription?.unsubscribe();
    this.currentSnapshot = null;

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

  private startPaymentFlow(): void {
    const method = this.stateSubject.value.selectedMethod;
    if (method === 'VIETQR') {
      this.startVietQrPayment();
    } else if (method === 'PAYPAL') {
      this.startPaypalPayment();
    }
  }

  private startVietQrPayment(): void {
    this.patchState({
      isLoading: true,
      errorMessage: '',
      statusMessage: '',
      qrImageUrl: '',
      isVietQrSuccess: false,
    });
    this.currentSnapshot = null;
    this.snapshotSubscription?.unsubscribe();
    this.listenForVietQrUpdates();

    this.ensurePendingPaymentSession()
      .then(() => {
        if (this.stateSubject.value.selectedMethod !== 'VIETQR') {
          return;
        }

        if (this.pendingVietQrPayment) {
          const snapshot: VietQrPaymentSnapshot = {
            payment: this.pendingVietQrPayment,
          };
          this.vietQrPaymentFlow.resume(snapshot);
          this.patchState({ isLoading: false, statusMessage: '' });
          this.applySnapshot(snapshot);
          this.pendingVietQrPayment = null;
          return;
        }

        this.vietQrPaymentFlow.start(this.buildVietQrPaymentInput()).subscribe({
          next: (snapshot) => {
            if (this.stateSubject.value.selectedMethod !== 'VIETQR') {
              return;
            }

            this.patchState({ isLoading: false, statusMessage: '' });
            this.applySnapshot(snapshot);
          },
          error: (err) => {
            console.error('VietQR payment error:', err);
            this.patchState({
              isLoading: false,
              errorMessage:
                err.error?.message ||
                err.message ||
                'Unable to create VietQR payment request.',
            });
          },
        });
      })
      .catch((err) => {
        console.error('VietQR payment error:', err);
        this.patchState({
          isLoading: false,
          errorMessage:
            err.error?.message ||
            err.message ||
            'Unable to create VietQR payment request.',
        });
      });
  }

  private startPaypalPayment(): void {
    if (!this.checkoutDraft && !this.pendingPaymentSession) return;

    this.patchState({
      isLoading: true,
      errorMessage: '',
      statusMessage: '',
      paypalRedirectUrl: '',
    });

    this.ensurePendingPaymentSession()
      .then(() => {
        if (this.stateSubject.value.selectedMethod !== 'PAYPAL') {
          return;
        }

        this.createOrReusePaypalPayment().subscribe({
          next: (result) => {
            this.savePendingPaymentSessionFromPayment(result);
            this.paypalPaymentOrderId = result.orderId;
            this.paypalPaymentInvoiceId = result.invoiceId;

            // Persist orderId/invoiceId in sessionStorage so they survive
            // the full-page redirect to PayPal and back.
            this.savePaypalSession(result.orderId, result.invoiceId);

            this.patchState({
              isLoading: false,
              paypalRedirectUrl: result.paymentUrl || '',
              statusMessage: result.paymentUrl
                ? this.stateSubject.value.paypalApproved
                  ? 'PayPal payment approved. Click "Confirm Payment" to complete your purchase.'
                  : ''
                : 'PayPal payment created. Awaiting redirect URL.',
            });
          },
          error: (err) => {
            console.error('PayPal payment error:', err);
            this.patchState({
              isLoading: false,
              errorMessage:
                err.error?.message ||
                err.message ||
                'Unable to create PayPal payment request.',
            });
          },
        });
      })
      .catch((err) => {
        console.error('PayPal payment error:', err);
        this.patchState({
          isLoading: false,
          errorMessage:
            err.error?.message ||
            err.message ||
            'Unable to create PayPal payment request.',
        });
      });
  }

  private ensurePendingPaymentSession(): Promise<PendingPaymentSession> {
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

    this.pendingPaymentSessionPromise = new Promise((resolve, reject) => {
      this.placeOrderApi
        .createPayment({
          items: this.checkoutDraftService.toPlaceOrderItems(
            this.checkoutDraft!,
          ),
          deliveryInfo: this.checkoutDraft!.deliveryInfo,
          paymentMethod: 'VIETQR',
        })
        .subscribe({
          next: (payment) => {
            const session = this.savePendingPaymentSessionFromPayment(payment);
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

  confirmOrder(): void {
    this.patchState({ errorMessage: '' });

    if (this.stateSubject.value.isLoading) {
      this.patchState({
        statusMessage: 'Your payment is still being prepared. Please wait.',
      });
      return;
    }

    if (this.stateSubject.value.selectedMethod === 'PAYPAL') {
      // If PayPal payment has been approved (user returned from PayPal), capture the payment
      if (this.stateSubject.value.paypalApproved) {
        this.capturePaypalPayment();
        return;
      }

      // If PayPal payment has been confirmed, navigate to result
      if (this.stateSubject.value.paypalConfirmed) {
        this.router.navigate(['/order-result']);
        return;
      }

      // Otherwise, redirect user to PayPal
      const paypalUrl = this.stateSubject.value.paypalRedirectUrl;
      if (paypalUrl) {
        window.location.href = paypalUrl;
      } else {
        this.patchState({
          statusMessage: 'PayPal redirect URL is not available yet.',
        });
      }
      return;
    }

    this.confirmVietQrPayment();
  }

  cancelOrder(): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    // TODO: Implement cancel order via order service.
  }

  goToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  private handlePaypalReturn(): void {
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
      statusMessage: 'PayPal payment approved. Confirming your payment...',
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
      return;
    }

    this.capturePaypalPayment();
  }

  private handlePaypalCancelReturn(): void {
    this.clearPaypalSession();
    this.paypalPaymentOrderId = null;
    this.paypalPaymentInvoiceId = null;

    if (!this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/product-catalog']);
      return;
    }

    this.patchState({
      selectedMethod: 'PAYPAL',
      paypalApproved: false,
      paypalConfirmed: false,
      paypalRedirectUrl: '',
      errorMessage: '',
      statusMessage: 'PayPal payment was cancelled. Creating a new payment...',
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { paypalCancel: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.startPaypalPayment();
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
          // Clear checkout draft, cart and PayPal session since payment is completed
          this.checkoutDraftService.clear();
          this.cartStore.clear();
          this.clearPaypalSession();
          this.clearPendingPaymentSession();
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
      this.saveVietQrOrderResult();
      this.checkoutDraftService.clear();
      this.cartStore.clear();
      this.clearPendingPaymentSession();
      this.vietQrPaymentFlow.clearSnapshot();
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
            this.saveVietQrOrderResult(snapshot);
            this.patchState({
              isLoading: false,
              statusMessage: 'Payment confirmed successfully! Redirecting...',
              errorMessage: '',
            });
            this.checkoutDraftService.clear();
            this.cartStore.clear();
            this.clearPendingPaymentSession();
            this.vietQrPaymentFlow.clearSnapshot();
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

  private saveVietQrOrderResult(snapshot?: VietQrPaymentSnapshot): void {
    const successfulSnapshot =
      snapshot ?? this.currentSnapshot ?? this.vietQrPaymentFlow.currentSnapshot;

    if (!successfulSnapshot) return;

    const transaction = successfulSnapshot.latestTransaction;

    this.saveOrderResult({
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      transactionId:
        transaction?.transactionId ||
        transaction?.gatewayOrderId ||
        successfulSnapshot.payment.paymentTransactionId ||
        successfulSnapshot.payment.orderId,
      orderId: successfulSnapshot.payment.orderId,
      invoiceId: successfulSnapshot.payment.invoiceId,
      completedAt:
        transaction?.transactionDateTime || new Date().toISOString(),
    });
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

  private applySnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.currentSnapshot = snapshot;
    this.patchState({
      isVietQrSuccess: snapshot.latestTransaction?.status === 'SUCCESS',
      statusMessage:
        snapshot.latestTransaction?.status === 'SUCCESS'
          ? ''
          : this.stateSubject.value.statusMessage,
    });
    this.updateQrImageUrl();
  }

  private readQrSource(): string {
    return (
      this.currentSnapshot?.latestTransaction?.qrCode ||
      this.currentSnapshot?.payment.qrCode ||
      ''
    );
  }

  private updateQrImageUrl(): void {
    const qrSource = this.readQrSource();

    if (!qrSource) {
      this.patchState({ qrImageUrl: '' });
      return;
    }

    QRCode.toDataURL(qrSource, {
      width: 220,
      margin: 1,
    })
      .then((url) => {
        if (this.readQrSource() === qrSource) {
          this.patchState({ qrImageUrl: url });
        }
      })
      .catch((err) => {
        console.error('Generate QR image failed:', err);
        this.patchState({ qrImageUrl: '' });
      });
  }

  private buildVietQrPaymentInput(): VietQrPaymentInput {
    if (!this.pendingPaymentSession) {
      throw new Error('Pending order is required to create VietQR payment.');
    }

    return {
      existingPayment: this.pendingPaymentSession,
    };
  }

  private createOrReusePaypalPayment(): Observable<PlaceOrderPaymentResult> {
    if (!this.pendingPaymentSession) {
      throw new Error('Pending order is required to create PayPal payment.');
    }

    return this.paymentService
      .requestPayment({
        orderId: this.pendingPaymentSession.orderId,
        invoiceId: this.pendingPaymentSession.invoiceId,
        paymentMethod: 'PAYPAL',
        amount: this.pendingPaymentSession.totalAmount,
        customerEmail: this.pendingPaymentSession.customerEmail,
      })
      .pipe(
        map((paymentResult) =>
          this.mapRequestPaymentResult(
            this.pendingPaymentSession!,
            paymentResult,
          ),
        ),
      );
  }

  private mapRequestPaymentResult(
    existingPayment: PendingPaymentSession,
    paymentResult: PaymentResultDto,
  ): PlaceOrderPaymentResult {
    return {
      orderId: existingPayment.orderId,
      invoiceId: existingPayment.invoiceId,
      totalAmount: existingPayment.totalAmount,
      paymentMethod: paymentResult.paymentMethod,
      paymentStatus: paymentResult.status,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      paymentTransactionId: paymentResult.transactionId,
      message: paymentResult.message,
    };
  }

  private applyCheckoutDraft(draft: CheckoutDraft): void {
    const subtotal = draft.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const order: OrderSummary = {
      items: draft.items.map((item) => ({
        id: item.productId.toString(),
        name: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      vatRate: EMPTY_ORDER.vatRate,
      shippingFee: EMPTY_ORDER.shippingFee,
      total: subtotal + subtotal * EMPTY_ORDER.vatRate,
    };

    this.setOrder(order);
  }

  private loadInvoicePreview(draft: CheckoutDraft): void {
    this.placeOrderApi
      .previewInvoice({
        items: this.checkoutDraftService.toPlaceOrderItems(draft),
        deliveryInfo: draft.deliveryInfo,
      })
      .subscribe({
        next: (preview) => this.applyInvoicePreview(preview),
        error: (err) => console.error('Load invoice preview failed:', err),
      });
  }

  private applyInvoicePreview(preview: InvoicePreview): void {
    const currentItemsById = new Map(
      this.stateSubject.value.order.items.map((item) => [item.id, item]),
    );
    const previewItems =
      preview.items.length > 0
        ? preview.items.map((item) => {
            const id = item.productId.toString();
            const currentItem = currentItemsById.get(id);

            return {
              id,
              name:
                item.title || currentItem?.name || `Product ${item.productId}`,
              quantity: item.quantity,
              unitPrice: item.price,
            };
          })
        : this.stateSubject.value.order.items;

    this.setOrder({
      items: previewItems,
      subtotal: preview.subtotalBeforeVat,
      vatRate:
        preview.subtotalBeforeVat > 0
          ? preview.vatAmount / preview.subtotalBeforeVat
          : EMPTY_ORDER.vatRate,
      shippingFee: preview.deliveryFee,
      total: preview.totalAmount,
    });
  }

  private setOrder(order: OrderSummary): void {
    this.patchState({
      order,
      cartItemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }

  private patchState(patch: Partial<PaymentPageState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch,
    });
  }

  // ── PayPal session persistence (survives full-page redirect) ──

  private savePaypalSession(orderId: string, invoiceId: string): void {
    try {
      sessionStorage.setItem(
        PAYPAL_SESSION_KEY,
        JSON.stringify({ orderId, invoiceId }),
      );
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }

  private loadPaypalSession(): { orderId: string; invoiceId: string } | null {
    try {
      const raw = sessionStorage.getItem(PAYPAL_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.orderId && parsed?.invoiceId) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private clearPaypalSession(): void {
    try {
      sessionStorage.removeItem(PAYPAL_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  private savePendingPaymentSessionFromPayment(
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
      checkoutKey: this.buildCheckoutKey(this.checkoutDraft),
    };

    try {
      sessionStorage.setItem(
        PENDING_PAYMENT_SESSION_KEY,
        JSON.stringify(this.pendingPaymentSession),
      );
    } catch {
      // sessionStorage may be unavailable in some environments
    }

    return this.pendingPaymentSession;
  }

  private loadPendingPaymentSession(
    draft: CheckoutDraft | null,
  ): PendingPaymentSession | null {
    try {
      const raw = sessionStorage.getItem(PENDING_PAYMENT_SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const checkoutKey = this.buildCheckoutKey(draft);
      if (
        parsed?.orderId &&
        parsed?.invoiceId &&
        Number.isFinite(parsed?.totalAmount) &&
        parsed?.customerEmail &&
        parsed?.checkoutKey === checkoutKey
      ) {
        return parsed;
      }

      this.clearPendingPaymentSession();
      return null;
    } catch {
      return null;
    }
  }

  private clearPendingPaymentSession(): void {
    this.pendingPaymentSession = null;
    this.pendingPaymentSessionPromise = null;
    this.pendingVietQrPayment = null;
    try {
      sessionStorage.removeItem(PENDING_PAYMENT_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  private buildCheckoutKey(draft: CheckoutDraft | null): string {
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

  private saveOrderResult(state: OrderResultState): void {
    try {
      sessionStorage.setItem(ORDER_RESULT_STATE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }
}
