// src/app/payment/payment.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import * as QRCode from 'qrcode';
import {
  OrderSummary,
  PaymentMethod,
  PaymentService,
} from '../app/services/payment.service';
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
import { StatusMessageComponent } from '../app/shared/ui/status-message/status-message';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, StatusMessageComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class PaymentComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  statusMessage = '';
  selectedPaymentMethod: PaymentMethod = 'VIETQR';
  vietQrSnapshot: VietQrPaymentSnapshot | null = null;
  qrImageUrl = '';

  order: OrderSummary = {
    items: [
      { id: '1', name: 'Abstract Liquid Gradient Pack', quantity: 1, unitPrice: 450000 },
      { id: '2', name: 'Retro Arcade Cabinet Pro', quantity: 2, unitPrice: 1200000 },
    ],
    subtotal: 2850000,
    vatRate: 0.1,
    shippingFee: 0,
    total: 0,
  };

  private readonly paymentService = inject(PaymentService);
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private snapshotSubscription?: Subscription;
  private checkoutDraft: CheckoutDraft | null = null;

  ngOnInit(): void {
    this.checkoutDraft = this.checkoutDraftService.get();
    this.applyCheckoutDraft();
    this.order.total = this.paymentService.calculateTotal(
      this.order.subtotal,
      this.order.vatRate,
      this.order.shippingFee,
    );
    this.loadInvoicePreview();

    const existingVietQrSnapshot = this.vietQrPaymentFlow.currentSnapshot;
    if (existingVietQrSnapshot) {
      this.vietQrSnapshot = existingVietQrSnapshot;
      this.updateQrImageUrl();
      this.listenForVietQrUpdates();
      this.statusMessage = this.isVietQrSuccess
        ? 'Bạn đã thanh toán thành công.'
        : 'VietQR code is ready. Please complete the payment.';
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

    if (this.selectedPaymentMethod === 'PAYPAL') {
      this.handlePayPalPayment();
    } else if (this.selectedPaymentMethod === 'VIETQR') {
      this.handleVietQrPayment();
    }
  }

  checkPaymentStatus(): void {
    this.errorMessage = '';

    if (this.isLoading) {
      this.statusMessage = 'Đang tạo mã QR thanh toán.';
      return;
    }

    if (this.isVietQrSuccess) {
      this.statusMessage = 'Bạn đã thanh toán thành công.';
      return;
    }

    this.statusMessage = 'Bạn chưa thanh toán.';
  }

  handlePayPalPayment(): void {
    this.paymentService
      .requestPayment({
        orderId: 'ORDER_001',
        invoiceId: 'INV_001',
        paymentMethod: this.selectedPaymentMethod,
        amount: this.order.total,
        customerEmail: 'customer@example.com',
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.paymentUrl) {
            window.location.href = res.paymentUrl;
          } else {
            this.errorMessage = 'Server khÃ´ng tráº£ vá» URL thanh toÃ¡n.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Payment error:', err);
          this.errorMessage =
            err.error?.message || err.message || 'Lá»—i káº¿t ná»‘i tá»›i server.';
        },
      });
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
        this.statusMessage = 'VietQR code is ready. Sandbox callback requested.';
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
          this.statusMessage = 'Bạn đã thanh toán thành công.';
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
    if (this.checkoutDraft) {
      return {
        items: this.checkoutDraftService.toPlaceOrderItems(this.checkoutDraft),
        deliveryInfo: this.checkoutDraft.deliveryInfo,
      };
    }

    return {
      items: this.order.items.map((item) => ({
        productId: Number(item.id),
        quantity: item.quantity,
      })),
      deliveryInfo: {
        receiverName: 'Sarah Jenkins',
        phoneNumber: '0981413168',
        email: 'customer@example.com',
        province: 'Hanoi',
        streetAddress: '123 Media Blvd, Suite 400',
        shippingInstructions: 'Sandbox VietQR payment test',
      },
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
}
