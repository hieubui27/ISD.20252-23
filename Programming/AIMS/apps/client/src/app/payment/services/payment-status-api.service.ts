import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import { PaymentMethod } from '../../services/payment.service';
import {
  PaymentTransactionStatus,
  VietQrTestCallbackRequest,
} from '../models/vietqr-payment.models';

@Injectable({ providedIn: 'root' })
/**
 * SOLID review:
 * - ISP: Low risk. One API service exposes both production payment status lookup
 *   and VietQR sandbox callback triggering, so callers may depend on a wider
 *   surface than they need.
 * - OCP: Low risk. Adding non-VietQR status actions or removing sandbox support
 *   requires changing this shared API service.
 * - Improvement: Split PaymentTransactionStatusApi from
 *   VietQrSandboxCallbackApi. Production flows should depend only on the status
 *   lookup API.
 */
export class PaymentStatusApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/payments`;

  getLatestByOrderId(
    orderId: string,
    paymentMethod?: PaymentMethod,
  ): Observable<PaymentTransactionStatus> {
    const options = paymentMethod
      ? { params: { paymentMethod } }
      : undefined;

    return this.http.get<PaymentTransactionStatus>(
      `${this.baseUrl}/transactions/order/${orderId}`,
      options,
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
