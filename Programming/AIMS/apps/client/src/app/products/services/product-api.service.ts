import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AIMS_API_BASE_URL}/products`;

  findAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }
}
