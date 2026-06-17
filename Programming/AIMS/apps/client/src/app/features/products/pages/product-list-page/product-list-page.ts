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
import { AimsPaginationComponent } from '../../../../shared/ui/aims-pagination/aims-pagination';
import { StatusMessageComponent } from '../../../../shared/ui/status-message/status-message';
import { ProductCardComponent } from '../../components/product-card/product-card';
import {
  ProductListItem,
  ProductSortOption,
  ProductType,
} from '../../models/product.model';
import { CartStoreService } from '../../../../cart/services/cart-store.service';

/** All product categories offered as catalog filters. */
const PRODUCT_TYPE_OPTIONS: ProductType[] = ['BOOK', 'CD', 'DVD', 'NEWSPAPER'];

/** Number of products loaded per page / per API call. */
const PAGE_SIZE = 20;

/**
 * Module: ProductListPageComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This page coordinates server-side catalog loading, browse filters,
 *      sorting and pagination state.
 * OCP: Satisfied. Product card rendering is delegated to ProductCardComponent.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It depends only on ProductApiService.getProductsPaged().
 * DIP: Partially satisfied. Data access is delegated to ProductApiService.
 *
 * Pagination strategy:
 * Filtering (category + search), sorting and pagination are resolved by the backend so
 * that the "X items" count, the total number of pages and the visible products always
 * agree with the active filter. Only one page (PAGE_SIZE products) is fetched per request.
 * Sequential "next page" navigation under the default sort uses the keyset cursor returned
 * by the server; jumping directly to a page number uses the page index. Either way, each
 * page change triggers exactly one API call that loads the next set of products.
 */
@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [
    CommonModule,
    AimsFooterComponent,
    AimsHeaderComponent,
    AimsPaginationComponent,
    ProductCardComponent,
    StatusMessageComponent,
  ],
  templateUrl: './product-list-page.html',
  styleUrl: './product-list-page.scss',
})
export class ProductListPageComponent implements OnInit {
  /** Products of the currently displayed page only. */
  readonly products = signal<ProductListItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly selectedTypes = signal<Set<ProductType>>(new Set());
  readonly sortBy = signal<ProductSortOption>('recommended');
  readonly searchQuery = signal('');

  /** Total products matching the active filter (across all pages), from the server. */
  readonly totalCount = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly pageSize = PAGE_SIZE;

  /** Static list of category filter options. */
  readonly productTypes = PRODUCT_TYPE_OPTIONS;

  /** Index of the first item shown on the current page (1-based), for the toolbar. */
  readonly rangeStart = computed(() =>
    this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1,
  );
  /** Index of the last item shown on the current page, for the toolbar. */
  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.totalCount()),
  );

  /**
   * Keyset cursors discovered while paging: pageNumber -> cursor that loads it.
   * Page 1 has no cursor. Used to keep sequential navigation cursor-based.
   */
  private readonly pageCursors = new Map<number, string>();

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

    this.loadPage(1);
  }

  /**
   * Loads a single page of products from the backend using the active filter,
   * search term and sort order. Uses the keyset cursor when navigating the
   * default sort sequentially, otherwise the page index.
   */
  private loadPage(page: number): void {
    const sort = this.sortBy();
    const cursor =
      sort === 'recommended' ? this.pageCursors.get(page) : undefined;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.productApi
      .getProductsPaged({
        categories: Array.from(this.selectedTypes()),
        search: this.searchQuery().trim() || undefined,
        sort,
        cursor,
        page,
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.products.set(result.items);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages);
          this.currentPage.set(result.page);

          // Remember the cursor that loads the following page so the next "Next"
          // click can use keyset pagination instead of an offset scan.
          if (result.nextCursor) {
            this.pageCursors.set(result.page + 1, result.nextCursor);
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Cannot load products from backend.');
          this.products.set([]);
          this.isLoading.set(false);
        },
      });
  }

  /** Resets paging state and reloads from page 1 (after a filter/sort/search change). */
  private reloadFromFirstPage(): void {
    this.pageCursors.clear();
    this.loadPage(1);
  }

  onPageChange(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }
    this.loadPage(page);
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
    this.reloadFromFirstPage();
  }

  updateSort(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.sortBy.set((select?.value as ProductSortOption) ?? 'recommended');
    this.reloadFromFirstPage();
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
    this.reloadFromFirstPage();
  }

  isTypeSelected(type: ProductType): boolean {
    return this.selectedTypes().has(type);
  }

  resetFilters(): void {
    this.selectedTypes.set(new Set());
    this.sortBy.set('recommended');
    this.searchQuery.set('');
    this.reloadFromFirstPage();
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
