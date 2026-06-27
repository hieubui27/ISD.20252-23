import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import { PaymentMethod } from '../../services/payment.service';
import {
  PaymentTransactionStatus,
  VietQrTestCallbackRequest,
} from '../models/vietqr-payment.models';

/**
 * Service: PaymentStatusApiService
 *
 * SOLID Review:
 * SRP: Satisfied. This service keeps payment status HTTP calls in one place.
 * OCP: Acceptable. New payment status endpoints can be added without changing callers.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Mostly satisfied. The status lookup and VietQR sandbox call are separate methods.
 * DIP: Satisfied. Components depend on this wrapper instead of HttpClient details.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The service exchanges small request/response DTOs with payment APIs,
 *   and all methods support the payment status flow.
 */
@Injectable({ providedIn: 'root' })
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
