import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-vietqr-payment-view',
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
    <div class="vietqr-card">
      <div class="vietqr-card__qr">
        @if (qrImageUrl) {
          <img [src]="qrImageUrl" alt="QR Code" />
        } @else {
          <span>QR</span>
        }
      </div>
      <div class="vietqr-card__hint">
        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="5"
            height="5"
            rx="0.5"
            stroke="#414752"
            stroke-width="1.2"
          />
          <rect
            x="8"
            y="1"
            width="5"
            height="5"
            rx="0.5"
            stroke="#414752"
            stroke-width="1.2"
          />
          <rect
            x="1"
            y="8"
            width="5"
            height="5"
            rx="0.5"
            stroke="#414752"
            stroke-width="1.2"
          />
          <rect x="9" y="9" width="1.5" height="1.5" fill="#414752" />
          <rect x="11.5" y="9" width="1.5" height="1.5" fill="#414752" />
          <rect x="9" y="11.5" width="1.5" height="1.5" fill="#414752" />
          <rect x="11.5" y="11.5" width="1.5" height="1.5" fill="#414752" />
        </svg>
        Scan to pay via any supported banking app
      </div>
    </div>
  `,
})
export class VietQrPaymentViewComponent {
  @Input() qrImageUrl = '';
}
