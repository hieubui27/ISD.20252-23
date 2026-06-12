import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { AimsFooterComponent } from '../../../../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../../../../shared/layout/aims-header/aims-header';
import { StatusMessageComponent } from '../../../../shared/ui/status-message/status-message';
import { ProductCardComponent } from '../../components/product-card/product-card';
import {
  ProductListItem,
  ProductType,
  isUnavailableProductStatus,
} from '../../models/product.model';
import { CartStoreService } from '../../../../cart/services/cart-store.service';

type ProductSortOption = 'recommended' | 'priceAsc' | 'priceDesc' | 'titleAsc';

/**
 * Module: ProductListPageComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This page coordinates product list loading, browse filters, sorting, and page-level states.
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
  readonly selectedTypes = signal<Set<ProductType>>(new Set());
  readonly sortBy = signal<ProductSortOption>('recommended');
  readonly searchQuery = signal('');
  /** Only active, in-stock products are offered to customers. */
  readonly availableProducts = computed(() =>
    this.products().filter(
      (product) =>
        !isUnavailableProductStatus(product.status) &&
        Number(product.stockQuantity) > 0,
    ),
  );
  readonly productTypes = computed(() =>
    Array.from(
      new Set(this.availableProducts().map((product) => product.type)),
    ).sort(),
  );
  readonly filteredProducts = computed(() => {
    const selectedTypes = this.selectedTypes();
    const sortBy = this.sortBy();
    const query = this.searchQuery().trim().toLowerCase();

    const filteredProducts = this.availableProducts().filter((product) => {
      const matchesType =
        selectedTypes.size === 0 || selectedTypes.has(product.type);
      const matchesQuery =
        query.length === 0 ||
        product.title.toLowerCase().includes(query) ||
        product.type.toLowerCase().includes(query);

      return matchesType && matchesQuery;
    });

    if (sortBy === 'priceAsc') {
      return [...filteredProducts].sort(
        (left, right) => left.currentPrice - right.currentPrice,
      );
    }

    if (sortBy === 'priceDesc') {
      return [...filteredProducts].sort(
        (left, right) => right.currentPrice - left.currentPrice,
      );
    }

    if (sortBy === 'titleAsc') {
      return [...filteredProducts].sort((left, right) =>
        left.title.localeCompare(right.title),
      );
    }

    return filteredProducts;
  });

  private readonly productApi = inject(ProductApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly cartCount = inject(CartStoreService).count;

  ngOnInit(): void {
    if (this.redirectPaypalReturnToPayment()) {
      return;
    }

    const initialQuery = this.route.snapshot.queryParamMap.get('q');
    if (initialQuery) {
      this.searchQuery.set(initialQuery);
    }

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
    this.router.navigate(['/product-catalog']);
  }

  goToCatalog(): void {
    this.router.navigate(['/product-catalog']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateSort(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.sortBy.set((select?.value as ProductSortOption) ?? 'recommended');
  }

  toggleType(type: ProductType): void {
    this.selectedTypes.update((selectedTypes) => {
      const nextSelectedTypes = new Set(selectedTypes);

      if (nextSelectedTypes.has(type)) {
        nextSelectedTypes.delete(type);
      } else {
        nextSelectedTypes.add(type);
      }

      return nextSelectedTypes;
    });
  }

  isTypeSelected(type: ProductType): boolean {
    return this.selectedTypes().has(type);
  }

  resetFilters(): void {
    this.selectedTypes.set(new Set());
    this.sortBy.set('recommended');
  }

  private redirectPaypalReturnToPayment(): boolean {
    const token = this.route.snapshot.queryParamMap.get('token');
    const payerId = this.route.snapshot.queryParamMap.get('PayerID');

    if (!token) {
      return false;
    }

    this.router.navigate(['/payment'], {
      queryParams: {
        token,
        ...(payerId ? { PayerID: payerId } : {}),
      },
      replaceUrl: true,
    });
    return true;
  }
}
