import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsHeaderComponent } from '../../shared/layout/aims-header/aims-header';
import {
  CancelOrderApiService,
  RefundOrderInfo,
} from '../services/cancel-order-api.service';

type CancelOrderStatus =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'success'
  | 'error';

@Component({
  selector: 'app-cancel-order',
  standalone: true,
  imports: [CommonModule, AimsButtonComponent, AimsHeaderComponent],
  templateUrl: './cancel-order.html',
  styleUrl: './cancel-order.scss',
})
export class CancelOrderComponent implements OnInit {
  // Signals: the app runs zoneless, so reactive state must be signal-based for
  // the view to update after async (HTTP) callbacks.
  readonly status = signal<CancelOrderStatus>('loading');
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly orderInfo = signal<RefundOrderInfo | null>(null);

  private orderId = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CancelOrderApiService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParamMap.get('orderId') ?? '';
    if (!this.orderId) {
      this.fail('Invalid link: missing order ID.');
      return;
    }
    this.loadOrder();
  }

  loadOrder(): void {
    this.status.set('loading');
    this.api
      .getOrderInfo(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          this.orderInfo.set(info);
          this.status.set('ready');
        },
        error: (err) => this.fail(this.readError(err, 'Order not found.')),
      });
  }

  confirmCancel(): void {
    if (this.status() === 'submitting') {
      return;
    }
    this.status.set('submitting');
    this.api
      .requestRefund(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.successMessage.set(result.message);
          this.status.set('success');
        },
        error: (err) =>
          this.fail(this.readError(err, 'Unable to cancel the order.')),
      });
  }

  returnHome(): void {
    this.router.navigate(['/product-catalog']);
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.status.set('error');
  }

  private readError(err: unknown, fallback: string): string {
    const apiError = err as { error?: { message?: string | string[] } };
    const message = apiError?.error?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message || fallback;
  }
}
