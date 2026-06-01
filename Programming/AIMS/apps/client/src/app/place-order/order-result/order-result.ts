import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsHeaderComponent } from '../../shared/layout/aims-header/aims-header';
import { VietQrPaymentFlowService } from '../../payment/flows/vietqr-payment-flow.service';
import { CheckoutDraftService } from '../services/checkout-draft.service';
import {
  ORDER_RESULT_STATE_KEY,
  OrderResultState,
} from './order-result-state';

@Component({
  selector: 'app-order-result',
  standalone: true,
  imports: [CommonModule, AimsButtonComponent, AimsHeaderComponent],
  templateUrl: './order-result.html',
  styleUrl: './order-result.scss',
})
export class OrderResultComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);

  private readonly snapshot = this.vietQrPaymentFlow.currentSnapshot;
  private readonly orderResult = this.readOrderResult();
  private readonly draft = this.checkoutDraftService.get();

  readonly transactionId =
    this.snapshot?.payment.paymentTransactionId ||
    this.snapshot?.latestTransaction?.gatewayOrderId ||
    this.orderResult?.transactionId ||
    this.snapshot?.payment.orderId ||
    'AIMS-PENDING';

  readonly orderDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  ngOnInit(): void {
    const hasSuccessfulVietQr =
      this.snapshot?.latestTransaction?.status === 'SUCCESS';
    const hasSuccessfulStoredResult = this.orderResult?.status === 'SUCCESS';

    if (!hasSuccessfulVietQr && !hasSuccessfulStoredResult) {
      this.router.navigate(['/payment']);
    }
  }

  get cartItemCount(): number {
    return this.draft?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  returnHome(): void {
    this.checkoutDraftService.clear();
    this.vietQrPaymentFlow.stop();
    this.vietQrPaymentFlow.clearSnapshot();
    this.clearOrderResult();
    this.router.navigate(['/product-catalog']);
  }

  private readOrderResult(): OrderResultState | null {
    try {
      const raw = sessionStorage.getItem(ORDER_RESULT_STATE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<OrderResultState>;
      if (parsed.status === 'SUCCESS' && parsed.transactionId) {
        return parsed as OrderResultState;
      }

      return null;
    } catch {
      return null;
    }
  }

  private clearOrderResult(): void {
    try {
      sessionStorage.removeItem(ORDER_RESULT_STATE_KEY);
    } catch {
      // ignore
    }
  }
}
