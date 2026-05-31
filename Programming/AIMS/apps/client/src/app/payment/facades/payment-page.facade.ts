import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import * as QRCode from 'qrcode';
import { OrderSummary, PaymentMethod } from '../../services/payment.service';
import { InvoicePreview } from '../../place-order/models/place-order.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PlaceOrderApiService } from '../../place-order/services/place-order-api.service';
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
};

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
  private readonly router = inject(Router);

  private readonly stateSubject = new BehaviorSubject<PaymentPageState>({
    ...INITIAL_STATE,
    order: { ...EMPTY_ORDER, items: [] },
  });
  readonly state$ = this.stateSubject.asObservable();

  private snapshotSubscription?: Subscription;
  private checkoutDraft: CheckoutDraft | null = null;
  private currentSnapshot: VietQrPaymentSnapshot | null = null;

  initialize(): void {
    this.checkoutDraft = this.checkoutDraftService.get();

    if (!this.checkoutDraftService.hasValidItems(this.checkoutDraft)) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/products']);
      return;
    }

    this.applyCheckoutDraft(this.checkoutDraft);
    this.loadInvoicePreview(this.checkoutDraft);

    const existingSnapshot = this.vietQrPaymentFlow.currentSnapshot;
    if (existingSnapshot) {
      this.vietQrPaymentFlow.resume(existingSnapshot);
      this.listenForVietQrUpdates();
      this.applySnapshot(existingSnapshot);
      return;
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

    this.vietQrPaymentFlow.start(this.buildVietQrPaymentInput()).subscribe({
      next: (snapshot) => {
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
  }

  private startPaypalPayment(): void {
    if (!this.checkoutDraft) return;

    this.patchState({
      isLoading: true,
      errorMessage: '',
      statusMessage: '',
      paypalRedirectUrl: '',
    });

    this.placeOrderApi
      .createPayment({
        items: this.checkoutDraftService.toPlaceOrderItems(this.checkoutDraft),
        deliveryInfo: this.checkoutDraft.deliveryInfo,
        paymentMethod: 'PAYPAL',
      })
      .subscribe({
        next: (result) => {
          this.patchState({
            isLoading: false,
            paypalRedirectUrl: result.paymentUrl || '',
            statusMessage: result.paymentUrl
              ? ''
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
      const paypalUrl = this.stateSubject.value.paypalRedirectUrl;
      if (paypalUrl) {
        window.open(paypalUrl, '_blank');
      } else {
        this.patchState({
          statusMessage: 'PayPal redirect URL is not available yet.',
        });
      }
      return;
    }

    if (this.stateSubject.value.isVietQrSuccess) {
      this.router.navigate(['/order-result']);
      return;
    }

    this.patchState({
      statusMessage:
        'Please complete your payment before confirming the order.',
    });
  }

  cancelOrder(): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    // TODO: Implement cancel order via order service.
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
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
    if (!this.checkoutDraft) {
      throw new Error('Checkout draft is required to create VietQR payment.');
    }

    return {
      items: this.checkoutDraftService.toPlaceOrderItems(this.checkoutDraft),
      deliveryInfo: this.checkoutDraft.deliveryInfo,
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
}
