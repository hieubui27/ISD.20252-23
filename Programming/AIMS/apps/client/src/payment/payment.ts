// src/app/payment/payment.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PaymentService,
  OrderSummary,
  PaymentMethod,
} from '../app/services/payment.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class PaymentComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  selectedPaymentMethod: PaymentMethod = 'PAYPAL';

  order: OrderSummary = {
    items: [
      { id: '1', name: 'Sony Alpha a7 III', quantity: 1, unitPrice: 1250000 },
    ],
    subtotal: 1250000,
    vatRate: 0.1,
    shippingFee: 0,
    total: 0,
  };

  private paymentService = inject(PaymentService);

  ngOnInit(): void {
    this.order.total = this.paymentService.calculateTotal(
      this.order.subtotal,
      this.order.vatRate,
      this.order.shippingFee,
    );
  }

  confirmPayment(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.selectedPaymentMethod === 'PAYPAL') {
      this.handlePayPalPayment();
    } else if (this.selectedPaymentMethod === 'VIETQR') {
      this.handleVietQrPayment();
    }
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
            this.errorMessage = 'Server không trả về URL thanh toán.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Payment error:', err);
          this.errorMessage =
            err.error?.message || err.message || 'Lỗi kết nối tới server.';
        },
      });
  }

  handleVietQrPayment(): void {
    //TODO: Implement VietQR payment flow
  }

  cancelOrder(): void {
    if (!confirm('Bạn có chắc muốn huỷ đơn hàng?')) return;
    // TODO: Implement cancel order via order service
  }
}
