// src/app/services/payment.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Shared interfaces ──

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderSummary {
  items: OrderItem[];
  subtotal: number;
  vatRate: number;
  shippingFee: number;
  total: number;
}

export type PaymentMethod = 'PAYPAL' | 'VIETQR';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUND_REQUIRED';

export interface RequestPaymentDto {
  orderId: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  customerEmail: string;
}

export interface ChangePaymentMethodDto {
  orderId: string;
  invoiceId: string;
  fromMethod: PaymentMethod;
  toMethod: PaymentMethod;
  customerEmail?: string;
}

export interface ConfirmTransactionDto {
  orderId: string;
  invoiceId: string;
  transactionId: string;
  transactionContent: string;
  transactionDateTime: string;
  status?: PaymentStatus;
  amount?: number;
}

export interface PaymentResultDto {
  success: boolean;
  status: string;
  paymentMethod: string;
  paymentUrl: string;
  qrCode: string;
  transactionId: string;
  message: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  invoiceId: string;
  paymentMethod: string;
  provider: string;
  amount: number;
  status: string;
  transactionId?: string;
  transactionContent?: string;
  transactionDateTime?: string;
  gatewayOrderId?: string;
  qrCode?: string;
  qrContent?: string;
  qrDataUrl?: string;
  qrLink?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = 'http://localhost:3000/api/payments';

  private http = inject(HttpClient);

  // ── Utility ──

  calculateTotal(
    subtotal: number,
    vatRate: number,
    shippingFee: number,
  ): number {
    return subtotal + subtotal * vatRate + shippingFee;
  }

  // ── POST /api/payments/request ──

  requestPayment(dto: RequestPaymentDto): Observable<PaymentResultDto> {
    return this.http.post<PaymentResultDto>(`${this.apiUrl}/request`, dto);
  }

  // ── POST /api/payments/change-method ──

  changePaymentMethod(
    dto: ChangePaymentMethodDto,
  ): Observable<PaymentResultDto> {
    return this.http.post<PaymentResultDto>(
      `${this.apiUrl}/change-method`,
      dto,
    );
  }

  // ── POST /api/payments/confirm ──

  confirmTransaction(dto: ConfirmTransactionDto): Observable<PaymentResultDto> {
    return this.http.post<PaymentResultDto>(`${this.apiUrl}/confirm`, dto);
  }

  // ── GET /api/payments/transactions/order/:orderId ──

  getPaymentTransactionByOrderId(
    orderId: string,
  ): Observable<PaymentTransaction> {
    return this.http.get<PaymentTransaction>(
      `${this.apiUrl}/transactions/order/${orderId}`,
    );
  }
}
