import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { ProductDetailComponent } from '../../components/product-detail/product-detail';
import { ProductDetail } from '../../models/product.model';

/**
 * Module: ProductDetailPageComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Partially satisfied. This component should only coordinate route parameter reading, loading state, and rendering.
 * OCP: Satisfied if product-type-specific rendering is delegated to child components.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It depends only on ProductApiService methods needed for reading product detail.
 * DIP: Partially satisfied. Data access is delegated to ProductApiService instead of hardcoded HTTP calls.
 *
 * Improvement Direction:
 * Keep this component thin and move UI details to ProductDetailComponent and type-specific components.
 */
@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductDetailComponent],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
})
export class ProductDetailPageComponent implements OnInit {
  readonly product = signal<ProductDetail | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly notFound = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly productApi = inject(ProductApiService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set('');
          this.notFound.set(false);
          this.product.set(null);
        }),
        switchMap((params) => {
          const productId = params.get('id');

          if (!productId) {
            return throwError(() => new Error('Missing product id.'));
          }

          return this.productApi.getProductDetail(productId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.handleLoadError(error);
        },
      });
  }

  private handleLoadError(error: unknown): void {
    this.isLoading.set(false);

    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.notFound.set(true);
      return;
    }

    this.errorMessage.set('Cannot load product detail from backend.');
  }
}
