import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import {
  PaymentTransactionStatus,
  VietQrTestCallbackRequest,
} from '../models/vietqr-payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentStatusApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/payments`;

  getLatestByOrderId(orderId: string): Observable<PaymentTransactionStatus> {
    return this.http.get<PaymentTransactionStatus>(
      `${this.baseUrl}/transactions/order/${orderId}`,
    );
  }

  requestVietQrSandboxCallback(
    dto: VietQrTestCallbackRequest,
  ): Observable<{ status?: string; message?: string }> {
    return this.http.post<{ status?: string; message?: string }>(
      `${this.baseUrl}/vietqr/test-callback`,
      dto,
    );
  }
}
