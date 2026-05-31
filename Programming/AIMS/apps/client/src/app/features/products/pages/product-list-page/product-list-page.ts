import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { AimsFooterComponent } from '../../../../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../../../../shared/layout/aims-header/aims-header';
import { StatusMessageComponent } from '../../../../shared/ui/status-message/status-message';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { ProductListItem } from '../../models/product.model';

/**
 * Module: ProductListPageComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This page coordinates product list loading and page-level states.
 * OCP: Satisfied. Product card rendering is delegated to ProductCardComponent.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It depends only on ProductApiService.getProducts().
 * DIP: Partially satisfied. Data access is delegated to ProductApiService.
 *
 * Improvement Direction:
 * Keep item rendering and detail presentation in child components.
 */
@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [
    CommonModule,
    AimsFooterComponent,
    AimsHeaderComponent,
    ProductCardComponent,
    StatusMessageComponent,
  ],
  templateUrl: './product-list-page.html',
  styleUrl: './product-list-page.scss',
})
export class ProductListPageComponent implements OnInit {
  readonly products = signal<ProductListItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  private readonly productApi = inject(ProductApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.productApi
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Cannot load products from backend.');
          this.isLoading.set(false);
        },
      });
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  goToCatalog(): void {
    this.router.navigate(['/product-catalog']);
  }
}
