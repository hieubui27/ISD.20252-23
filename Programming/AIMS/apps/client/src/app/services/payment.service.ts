// src/app/services/payment.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../core/api/api.config';

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

export interface ConfirmTransactionDto {
  orderId: string;
  invoiceId: string;
  paymentMethod?: PaymentMethod;
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

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly apiUrl = `${AIMS_API_BASE_URL}/payments`;
  private readonly http = inject(HttpClient);

  calculateTotal(
    subtotal: number,
    vatRate: number,
    shippingFee: number,
  ): number {
    return subtotal + subtotal * vatRate + shippingFee;
  }

  confirmTransaction(dto: ConfirmTransactionDto): Observable<PaymentResultDto> {
    return this.http.post<PaymentResultDto>(`${this.apiUrl}/confirm`, dto);
  }
}
