import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaymentMethod } from '../../../services/payment.service';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';
import { PAYMENT_METHOD } from '../../constants/payment.constants';

@Component({
  selector: 'app-payment-action-bar',
  standalone: true,
  imports: [CommonModule, AimsButtonComponent],
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  template: `
    <section class="action-panel">
      <app-aims-button
        type="button"
        variant="ghost"
        (pressed)="cancelPayment.emit()"
      >
        <svg viewBox="0 0 12 10" fill="none" aria-hidden="true">
          <path
            d="M11 5H1M5 1L1 5L5 9"
            stroke="#414752"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Cancel Order
      </app-aims-button>

      <app-aims-button
        type="button"
        [disabled]="isLoading"
        (pressed)="confirm.emit()"
      >
        @if (selectedMethod === paymentMethod.VIETQR) {
          {{ isLoading ? 'Processing Payment...' : 'Confirm Order' }}
        }
        @if (selectedMethod === paymentMethod.PAYPAL) {
          @if (paypalApproved) {
            {{ isLoading ? 'Confirming Payment...' : 'Confirm Payment' }}
          }
          @if (paypalConfirmed) {
            View Order
          }
          @if (!paypalApproved && !paypalConfirmed) {
            {{ isLoading ? 'Preparing PayPal...' : 'Pay with PayPal' }}
          }
        }
        @if (!isLoading && !isVietQrSuccess && !paypalConfirmed) {
          <svg viewBox="0 0 14 12" fill="none" aria-hidden="true">
            <path
              d="M1 6H13M8 1L13 6L8 11"
              stroke="white"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        }
        @if (paypalApproved && !isLoading) {
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style="width: 16px; height: 16px;"
          >
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 11.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z"
              fill="white"
            />
          </svg>
        }
      </app-aims-button>
    </section>
  `,
})
export class PaymentActionBarComponent {
  readonly paymentMethod = PAYMENT_METHOD;

  @Input() selectedMethod: PaymentMethod = PAYMENT_METHOD.VIETQR;
  @Input() isLoading = false;
  @Input() isVietQrSuccess = false;
  @Input() paypalApproved = false;
  @Input() paypalConfirmed = false;

  @Output() cancelPayment = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
