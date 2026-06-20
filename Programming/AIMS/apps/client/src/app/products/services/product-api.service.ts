import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import { Product } from '../models/product.model';

type ProductListResponse =
  | unknown[]
  | {
      data?: unknown[];
      items?: unknown[];
      products?: unknown[];
      content?: unknown[];
    };

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/products`;

  findAll(): Observable<Product[]> {
    return this.http
      .get<ProductListResponse>(this.baseUrl)
      .pipe(map((response) => this.unwrapProducts(response)));
  }

  private unwrapProducts(response: ProductListResponse): Product[] {
    const products = Array.isArray(response)
      ? response
      : (response.data ??
        response.products ??
        response.items ??
        response.content ??
        []);

    return products.map((product) => this.normalizeProduct(product));
  }

  private normalizeProduct(rawProduct: unknown): Product {
    const product =
      rawProduct && typeof rawProduct === 'object'
        ? (rawProduct as Record<string, unknown>)
        : {};

    return {
      id: String(product['id'] ?? ''),
      barcode: this.toString(product['barcode']),
      category: this.toString(product['category']),
      title: this.toString(product['title']),
      description: this.toString(product['description']),
      weight: this.toNumber(product['weight']),
      currentPrice: this.toNumber(product['currentPrice']),
      quantity: this.toNumber(product['stockQuantity'] ?? product['quantity']),
      status: this.toString(product['status']),
      imageUrl: this.toString(product['imageUrl']),
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toString(value: unknown): string {
    return value == null ? '' : String(value);
  }
}
