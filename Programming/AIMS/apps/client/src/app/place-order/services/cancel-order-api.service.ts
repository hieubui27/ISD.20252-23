import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';

export interface RefundOrderInfo {
  orderId: string;
  customerName: string;
  status: string;
  paymentMethod: string | null;
  totalAmount: number;
  cancellable: boolean;
}

export interface RefundResult {
  status: string;
  orderId: string;
  reason: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CancelOrderApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/payments/refund`;

  getOrderInfo(orderId: string): Observable<RefundOrderInfo> {
    return this.http.get<RefundOrderInfo>(`${this.baseUrl}/order-info`, {
      params: { orderId },
    });
  }

  requestRefund(orderId: string): Observable<RefundResult> {
    return this.http.post<RefundResult>(`${this.baseUrl}/request`, { orderId });
  }
}
