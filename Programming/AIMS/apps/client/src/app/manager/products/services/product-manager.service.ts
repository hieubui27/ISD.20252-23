import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    // The catalog endpoint now returns a paginated envelope ({ items, ... }).
    // The manager list is not paginated, so we omit paging params (the backend
    // then returns every product) and unwrap the items. We still tolerate a
    // plain array for backward compatibility.
    return this.http
      .get<ProductListItem[] | { items?: ProductListItem[] }>(this.apiUrl)
      .pipe(map((response) => this.unwrapItems(response)));
  }

  private unwrapItems(
    response: ProductListItem[] | { items?: ProductListItem[] },
  ): ProductListItem[] {
    if (Array.isArray(response)) {
      return response;
    }
    return response?.items ?? [];
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

  /**
   * Uploads an image file for a specific product.
   *
   * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
   * + Reason why: Data Coupling because it only receives simple data (productId, file).
   *   Functional Cohesion because it performs a single task: sending the file to the upload endpoint.
   */
  uploadImage(productId: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ imageUrl: string }>(
      `${this.apiUrl}/${productId}/upload-image`,
      formData,
    );
  }

  getAllLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/logs`);
  }
}
