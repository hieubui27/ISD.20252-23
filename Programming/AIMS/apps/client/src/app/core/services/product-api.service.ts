import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../api/api.config';
import {
  ProductDetail,
  ProductListItem,
} from '../../features/products/models/product.model';

/**
 * Module: ProductApiService
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This service centralizes HTTP access for product read APIs.
 * OCP: Satisfied. Components can stay unchanged if endpoint internals evolve behind this service.
 * LSP: Not applicable. This service does not define an inheritance hierarchy.
 * ISP: Satisfied. It exposes only read methods needed by list and detail screens.
 * DIP: Partially satisfied. Components depend on this Angular service instead of hardcoded HttpClient calls.
 *
 * Improvement Direction:
 * Keep all product read endpoint calls here and do not duplicate API URLs inside components.
 */
@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly apiUrl = `${AIMS_API_BASE_URL}/products`;
  private readonly http = inject(HttpClient);

  getProducts(): Observable<ProductListItem[]> {
    return this.http.get<ProductListItem[]>(this.apiUrl);
  }

  getProductDetail(productId: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.apiUrl}/${productId}`);
  }
}
