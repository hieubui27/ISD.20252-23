import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../../core/api/api.config';
import {
  ProductDetail,
  ProductListItem,
} from '../../../features/products/models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductManagerService {
  private readonly apiUrl = `${AIMS_API_BASE_URL}/products`;
  private readonly http = inject(HttpClient);

  getProducts(): Observable<ProductListItem[]> {
    return this.http.get<ProductListItem[]>(this.apiUrl);
  }

  getProductById(id: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.apiUrl}/${id}`);
  }

  createProduct(payload: any): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(this.apiUrl, payload);
  }

  updateProduct(id: string, payload: any): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`${this.apiUrl}/${id}`, payload);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  deleteBulkProducts(ids: string[]): Observable<any> {
    return this.http.request('delete', `${this.apiUrl}/bulk`, {
      body: { ids },
    });
  }
}
