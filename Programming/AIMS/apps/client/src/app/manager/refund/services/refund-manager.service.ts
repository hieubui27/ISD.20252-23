import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../../core/api/api.config';

export interface RefundListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface RefundListItem {
  id: string;
  rmaNumber: string;
  orderId: string;
  orderDisplayId: string;
  createdAt: string;
  resolution: string;
  imageUrl: string;
  itemsCount: number;
  customerPhone: string;
  status: string;
}

export interface RefundDetail {
  id: string;
  rmaNumber: string;
  orderId: string;
  orderDisplayId: string;
  createdAt: string;
  updatedAt?: string;
  resolution: string;
  status: string;
  reason: string;
  customerName: string;
  customerPhone: string;
  email: string;
  refundAmount: number;
  refundMethod: string;
  items: {
    productId: string;
    productTitle: string;
    imageUrl: string;
    quantity: number;
    price: number;
  }[];
  timeline: {
    action: string;
    date: string;
    actor?: string;
  }[];
}

export const REFUND_STATUSES = [
  'All',
  'Open RMAs',
  'Pending requests',
  'Approved requests',
  'In transit',
  'Shipment received',
  'Done',
  'Rejected requests',
  'Cancelled requests',
  'Shipment rejected',
  'Require attention',
];

@Injectable({
  providedIn: 'root',
})
export class RefundManagerService {
  private apiUrl = `${AIMS_API_BASE_URL}/order-manager/refunds`;

  private http = inject(HttpClient);

  getRefunds(
    params: RefundListParams,
  ): Observable<{ data: RefundListItem[]; total: number }> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.status && params.status !== 'All')
      httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<{ data: RefundListItem[]; total: number }>(
      this.apiUrl,
      { params: httpParams },
    );
  }

  getRefundById(id: string): Observable<RefundDetail> {
    return this.http.get<RefundDetail>(`${this.apiUrl}/${id}`);
  }

  approveRefund(id: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectRefund(id: string, reason: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/reject`, { reason });
  }

  markDone(id: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/done`, {});
  }
}
