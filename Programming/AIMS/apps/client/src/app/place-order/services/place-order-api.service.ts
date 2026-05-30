import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import {
  InvoicePreview,
  PlaceOrderPaymentRequest,
  PlaceOrderPaymentResult,
} from '../models/place-order.models';

@Injectable({ providedIn: 'root' })
export class PlaceOrderApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/place-order`;

  previewInvoice(
    dto: Omit<PlaceOrderPaymentRequest, 'paymentMethod'>,
  ): Observable<InvoicePreview> {
    return this.http.post<InvoicePreview>(`${this.baseUrl}/delivery-info`, dto);
  }

  createPayment(
    dto: PlaceOrderPaymentRequest,
  ): Observable<PlaceOrderPaymentResult> {
    return this.http.post<PlaceOrderPaymentResult>(
      `${this.baseUrl}/payment`,
      dto,
    );
  }
}
