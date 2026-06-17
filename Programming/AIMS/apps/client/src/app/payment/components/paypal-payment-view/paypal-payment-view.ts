import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-paypal-payment-view',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  template: `
    <div class="paypal-card">
      @if (!paypalApproved && !paypalConfirmed) {
        <div class="paypal-card__info">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a1 1 0 110 2 1 1 0 010-2zm1.5 9h-3a.5.5 0 010-1H7V7.5h-.5a.5.5 0 010-1H8a.5.5 0 01.5.5V11h.5a.5.5 0 110 1h.5z"
              fill="#414752"
            />
          </svg>
          <span
            >You will be redirected to PayPal to complete your payment
            securely.</span
          >
        </div>
      }
      @if (paypalApproved) {
        <div class="paypal-card__info paypal-card__info--approved">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 11.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z"
              fill="#0a8754"
            />
          </svg>
          <span>PayPal payment approved! We are finalizing your purchase.</span>
        </div>
      }
      @if (paypalConfirmed) {
        <div class="paypal-card__info paypal-card__info--confirmed">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 11.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z"
              fill="#0a8754"
            />
          </svg>
          <span
            >Payment confirmed successfully! Redirecting to your order
            summary...</span
          >
        </div>
      }
      @if (paypalRedirectUrl && !paypalApproved && !paypalConfirmed) {
        <a
          [href]="paypalRedirectUrl"
          target="_self"
          class="paypal-card__pay-btn"
        >
          <svg
            viewBox="0 0 100 26"
            fill="none"
            aria-hidden="true"
            class="paypal-card__btn-logo"
          >
            <path
              d="M12.5 3.8H6.2c-.4 0-.8.3-.9.7L3.1 20c0 .3.2.5.5.5h3c.4 0 .8-.3.9-.7l.6-3.6c0-.4.4-.7.9-.7h2c4.2 0 6.6-2 7.2-6 .3-1.7 0-3.1-.8-4.1C16.5 4.4 14.8 3.8 12.5 3.8zm.7 5.9c-.3 2.2-2.1 2.2-3.7 2.2h-1l.7-4.2c0-.2.2-.4.5-.4h.4c1.1 0 2.2 0 2.8.6.3.4.4 1 .3 1.8z"
              fill="#253B80"
            />
            <path
              d="M35.3 9.6h-3c-.2 0-.4.2-.5.4l-.1.8-.2-.3c-.6-.9-2-1.2-3.4-1.2-3.2 0-5.9 2.4-6.4 5.8-.3 1.7.1 3.3 1.1 4.4.9 1 2.2 1.4 3.7 1.4 2.6 0 4.1-1.7 4.1-1.7l-.1.8c0 .3.2.5.5.5h2.7c.4 0 .8-.3.9-.7l1.6-10.1c0-.2-.2-.5-.5-.5l.1.4zm-4.1 5.6c-.3 1.6-1.6 2.7-3.3 2.7-.8 0-1.5-.3-1.9-.7-.4-.5-.6-1.2-.5-2 .2-1.6 1.7-2.8 3.3-2.8.8 0 1.5.3 1.9.7.5.5.6 1.2.5 2.1z"
              fill="#253B80"
            />
            <path
              d="M55.1 9.6h-3c-.3 0-.5.1-.7.3l-3.8 5.6-1.6-5.4c-.1-.3-.5-.5-.8-.5h-3c-.3 0-.6.3-.5.7L44.9 20l-3 4.2c-.2.3 0 .8.4.8h3c.3 0 .5-.1.7-.3l9.3-13.4c.2-.3 0-.8-.4-.8l.2.1z"
              fill="#253B80"
            />
            <path
              d="M65.5 3.8h-6.3c-.4 0-.8.3-.9.7L56.2 20c0 .3.2.5.5.5h3.2c.3 0 .5-.2.6-.5l.6-3.8c0-.4.4-.7.9-.7h2c4.2 0 6.6-2 7.2-6 .3-1.7 0-3.1-.8-4.1C69.5 4.4 67.8 3.8 65.5 3.8zm.7 5.9c-.3 2.2-2.1 2.2-3.7 2.2h-1l.7-4.2c0-.2.2-.4.5-.4h.4c1.1 0 2.2 0 2.8.6.3.4.4 1 .3 1.8z"
              fill="#179BD7"
            />
            <path
              d="M88.3 9.6h-3c-.2 0-.4.2-.5.4l-.1.8-.2-.3c-.6-.9-2-1.2-3.4-1.2-3.2 0-5.9 2.4-6.4 5.8-.3 1.7.1 3.3 1.1 4.4.9 1 2.2 1.4 3.7 1.4 2.6 0 4.1-1.7 4.1-1.7l-.1.8c0 .3.2.5.5.5h2.7c.4 0 .8-.3.9-.7L89 10.2c-.1-.3-.3-.6-.7-.6zm-4.1 5.6c-.3 1.6-1.6 2.7-3.3 2.7-.8 0-1.5-.3-1.9-.7-.4-.5-.6-1.2-.5-2 .2-1.6 1.7-2.8 3.3-2.8.8 0 1.5.3 1.9.7.5.5.6 1.2.5 2.1z"
              fill="#179BD7"
            />
            <path
              d="M90.4 4.2l-2.2 14c0 .3.2.5.5.5h2.6c.4 0 .8-.3.9-.7l2.2-13.5c0-.3-.2-.5-.5-.5h-3c-.2 0-.4.1-.5.2z"
              fill="#179BD7"
            />
          </svg>
          Pay with PayPal
        </a>
      }
      @if (isLoading && !paypalApproved) {
        <div class="paypal-card__loading">
          <span class="paypal-card__spinner"></span>
          Preparing PayPal checkout&hellip;
        </div>
      }
    </div>
  `,
})
export class PaypalPaymentViewComponent {
  @Input() paypalRedirectUrl = '';
  @Input() paypalApproved = false;
  @Input() paypalConfirmed = false;
  @Input() isLoading = false;
}
