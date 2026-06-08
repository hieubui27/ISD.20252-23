import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../../core/api/api.config';

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface OrderListItem {
  id: string;
  orderId: string;
  customerName: string;
  createdAt: string;
  itemsCount: number;
  totalAmount?: number;
  status: string;
  invoice?: {
    totalAmount: number;
  };
}

export interface OrderDetail {
  id: string;
  orderId: string;
  customerName: string;
  email: string;
  phoneNumber: string;
  streetAddress: string;
  province: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  invoice: {
    totalAmount: number;
    vatSubtotal: number;
  };
  orderProducts: {
    productId: string;
    quantity: number;
    price: number;
    product: {
      title: string;
      imageUrl: string;
    };
  }[];
  paymentTransactions: {
    status: string;
    transactionDateTime: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderManagerService {
  private apiUrl = `${AIMS_API_BASE_URL}/order-manager/orders`;

  private http = inject(HttpClient);

  getOrders(
    params: OrderListParams,
  ): Observable<{ data: OrderListItem[]; total: number }> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<{ data: OrderListItem[]; total: number }>(
      this.apiUrl,
      { params: httpParams },
    );
  }

  getOrderById(id: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.apiUrl}/${id}`);
  }

  approveOrder(id: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectOrder(id: string, reason: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/reject`, { reason });
  }
}
