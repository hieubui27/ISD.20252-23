import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../../core/api/api.config';

import { map } from 'rxjs/operators';

export interface RefundListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface RefundListItem {
  id: string;
  orderId: string;
  orderDisplayId: string;
  createdAt: string;
  imageUrl: string;
  itemsCount: number;
  customerPhone: string;
  status: string;
  paymentMethod: string;
  contactMethod: string;
}

export interface RefundDetail {
  id: string;
  orderId: string;
  orderDisplayId: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  customerName: string;
  customerPhone: string;
  email: string;
  refundAmount: number;
  paymentMethod: string;
  contactMethod: string;
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
  'CANCELLED_BY_CUSTOMER',
  'REJECTED_BY_MANAGER',
];

@Injectable({
  providedIn: 'root',
})
export class RefundManagerService {
  private apiUrl = `${AIMS_API_BASE_URL}/order-manager/orders`;

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

    return this.http
      .get<{
        data: any[];
        total: number;
      }>(`${this.apiUrl}/refund-requests`, { params: httpParams })
      .pipe(
        map((response) => ({
          total: response.total,
          data: response.data.map((order) => {
            const pm =
              order.paymentTransactions?.[0]?.paymentMethod || 'UNKNOWN';
            return {
              id: order.id,
              orderId: order.id,
              orderDisplayId: order.orderId,
              createdAt: order.createdAt,
              imageUrl:
                order.orderProducts &&
                order.orderProducts.length > 0 &&
                order.orderProducts[0].product
                  ? order.orderProducts[0].product.imageUrl
                  : '',
              itemsCount: order.itemsCount,
              customerPhone: order.phoneNumber,
              status: order.status,
              paymentMethod: pm,
              contactMethod:
                pm === 'VIETQR' ? `Email: ${order.email}` : 'Automatic',
            };
          }),
        })),
      );
  }

  getRefundById(id: string): Observable<RefundDetail> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((order) => {
        const pm = order.paymentTransactions?.[0]?.paymentMethod || 'UNKNOWN';
        return {
          id: order.id,
          orderId: order.id,
          orderDisplayId: order.orderId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          status: order.status,
          customerName: order.customerName,
          customerPhone: order.phoneNumber,
          email: order.email,
          refundAmount: order.invoice?.totalAmount || order.subtotal,
          paymentMethod: pm,
          contactMethod:
            pm === 'VIETQR' ? `Email: ${order.email}` : 'Automatic',
          items:
            order.orderProducts?.map((p: any) => ({
              productId: p.productId,
              productTitle: p.product?.title,
              imageUrl: p.product?.imageUrl,
              quantity: p.quantity,
              price: p.price,
            })) || [],
          timeline: [],
        };
      }),
    );
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
