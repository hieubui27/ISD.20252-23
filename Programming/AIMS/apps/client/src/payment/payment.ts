// src/app/payment/payment.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as QRCode from 'qrcode';
import { OrderSummary } from '../app/services/payment.service';
import { VietQrPaymentFlowService } from '../app/payment/flows/vietqr-payment-flow.service';
import {
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../app/payment/models/vietqr-payment.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../app/place-order/services/checkout-draft.service';
import { InvoicePreview } from '../app/place-order/models/place-order.models';
import { PlaceOrderApiService } from '../app/place-order/services/place-order-api.service';
import { AimsFooterComponent } from '../app/shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../app/shared/layout/aims-header/aims-header';
import { AimsButtonComponent } from '../app/shared/ui/aims-button/aims-button';
import { StatusMessageComponent } from '../app/shared/ui/status-message/status-message';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    AimsFooterComponent,
    AimsHeaderComponent,
    StatusMessageComponent,
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class PaymentComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  statusMessage = '';
  vietQrSnapshot: VietQrPaymentSnapshot | null = null;
  qrImageUrl = '';

  order: OrderSummary = {
    items: [],
    subtotal: 0,
    vatRate: 0.1,
    shippingFee: 0,
    total: 0,
  };

  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private snapshotSubscription?: Subscription;
  private checkoutDraft: CheckoutDraft | null = null;

  ngOnInit(): void {
    this.checkoutDraft = this.checkoutDraftService.get();

    if (!this.checkoutDraft || this.checkoutDraft.items.length === 0) {
      this.router.navigate(['/products']);
      return;
    }

    this.applyCheckoutDraft();
    this.loadInvoicePreview();

    const existingVietQrSnapshot = this.vietQrPaymentFlow.currentSnapshot;
    if (existingVietQrSnapshot) {
      this.vietQrSnapshot = existingVietQrSnapshot;
      this.updateQrImageUrl();
      this.listenForVietQrUpdates();
      this.statusMessage = '';
      return;
    }

    this.confirmPayment();
  }

  ngOnDestroy(): void {
    this.snapshotSubscription?.unsubscribe();
    this.vietQrPaymentFlow.stop();
  }

  confirmPayment(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.statusMessage = '';

    this.handleVietQrPayment();
  }

  checkPaymentStatus(): void {
    this.errorMessage = '';

    if (this.isLoading) {
      this.statusMessage = 'Your payment QR is still being prepared. Please wait.';
      return;
    }

    if (this.isVietQrSuccess) {
      this.router.navigate(['/order-result']);
      return;
    }

    this.statusMessage = 'Please complete your payment before confirming the order.';
  }

  handleVietQrPayment(): void {
    this.vietQrSnapshot = null;
    this.qrImageUrl = '';
    this.snapshotSubscription?.unsubscribe();
    this.listenForVietQrUpdates();

    this.vietQrPaymentFlow.start(this.buildVietQrPaymentInput()).subscribe({
      next: (snapshot) => {
        this.isLoading = false;
        this.vietQrSnapshot = snapshot;
        this.updateQrImageUrl();
        this.statusMessage = '';
      },
      error: (err) => {
        this.isLoading = false;
        console.error('VietQR payment error:', err);
        this.errorMessage =
          err.error?.message ||
          err.message ||
          'Unable to create VietQR payment request.';
      },
    });
  }

  cancelOrder(): void {
    if (!confirm('Báº¡n cÃ³ cháº¯c muá»‘n huá»· Ä‘Æ¡n hÃ ng?')) return;
    // TODO: Implement cancel order via order service
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  get isVietQrPending(): boolean {
    return this.vietQrSnapshot?.latestTransaction?.status === 'PENDING';
  }

  get isVietQrSuccess(): boolean {
    return this.vietQrSnapshot?.latestTransaction?.status === 'SUCCESS';
  }

  get cartItemCount(): number {
    return this.order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  private listenForVietQrUpdates(): void {
    this.snapshotSubscription = this.vietQrPaymentFlow.snapshot$.subscribe(
      (latestSnapshot) => {
        if (!latestSnapshot) return;

        this.vietQrSnapshot = latestSnapshot;
        this.updateQrImageUrl();
        const status = latestSnapshot.latestTransaction?.status;

        if (status === 'SUCCESS') {
          this.statusMessage = '';
        } else if (status === 'FAILED' || status === 'REFUND_REQUIRED') {
          this.errorMessage = 'Payment could not be completed.';
        }
      },
    );
  }

  private readQrSource(): string {
    return (
      this.vietQrSnapshot?.latestTransaction?.qrCode ||
      this.vietQrSnapshot?.payment.qrCode ||
      ''
    );
  }

  private updateQrImageUrl(): void {
    const qrSource = this.readQrSource();

    if (!qrSource) {
      this.qrImageUrl = '';
      this.cdr.detectChanges();
      return;
    }

    QRCode.toDataURL(qrSource, {
      width: 220,
      margin: 1,
    })
      .then((url) => {
        if (this.readQrSource() === qrSource) {
          this.qrImageUrl = url;
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('Generate QR image failed:', err);
        this.qrImageUrl = '';
        this.cdr.detectChanges();
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

  private applyCheckoutDraft(): void {
    if (!this.checkoutDraft) return;

    this.order.items = this.checkoutDraft.items.map((item) => ({
      id: item.productId.toString(),
      name: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    this.order.subtotal = this.checkoutDraft.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    this.recalculateOrderTotal();
  }

  private loadInvoicePreview(): void {
    if (!this.checkoutDraft) return;

    this.placeOrderApi
      .previewInvoice({
        items: this.checkoutDraftService.toPlaceOrderItems(this.checkoutDraft),
        deliveryInfo: this.checkoutDraft.deliveryInfo,
      })
      .subscribe({
        next: (preview) => {
          this.applyInvoicePreview(preview);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Load invoice preview failed:', err);
        },
      });
  }

  private applyInvoicePreview(preview: InvoicePreview): void {
    const currentItemsById = new Map(
      this.order.items.map((item) => [item.id, item]),
    );

    if (preview.items.length > 0) {
      this.order.items = preview.items.map((item) => {
        const id = item.productId.toString();
        const currentItem = currentItemsById.get(id);

        return {
          id,
          name: item.title || currentItem?.name || `Product ${item.productId}`,
          quantity: item.quantity,
          unitPrice: item.price,
        };
      });
    }

    this.order.subtotal = preview.subtotalBeforeVat;
    this.order.vatRate =
      preview.subtotalBeforeVat > 0
        ? preview.vatAmount / preview.subtotalBeforeVat
        : 0.1;
    this.order.shippingFee = preview.deliveryFee;
    this.order.total = preview.totalAmount;
  }

  private recalculateOrderTotal(): void {
    this.order.total =
      this.order.subtotal +
      this.order.subtotal * this.order.vatRate +
      this.order.shippingFee;
  }
}
