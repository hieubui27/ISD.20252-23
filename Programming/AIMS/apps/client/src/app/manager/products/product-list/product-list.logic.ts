import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProductManagerService } from '../services/product-manager.service';
import { ProductListItem } from '../../../features/products/models/product.model';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class ProductListLogic {
  private router = inject(Router);
  private productManagerService = inject(ProductManagerService);
  private confirmDialogService = inject(ConfirmDialogService);
  private toastService = inject(ToastService);

  private allProductsSubject = new BehaviorSubject<ProductListItem[]>([]);
  public currentPageSubject = new BehaviorSubject<number>(1);
  public itemsPerPage = 20;

  public products$: Observable<ProductListItem[]> = combineLatest([
    this.allProductsSubject,
    this.currentPageSubject,
  ]).pipe(
    map(([products, page]) => {
      const start = (page - 1) * this.itemsPerPage;
      return products.slice(start, start + this.itemsPerPage);
    }),
  );

  public totalPages$: Observable<number> = this.allProductsSubject.pipe(
    map((products) => Math.ceil(products.length / this.itemsPerPage) || 1),
  );

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  public selectedIds = new Set<string>();

  public toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public toggleAll(event: any): void {
    const isChecked = event.target.checked;
    const page = this.currentPageSubject.value;
    const start = (page - 1) * this.itemsPerPage;
    const currentProducts = this.allProductsSubject.value.slice(
      start,
      start + this.itemsPerPage,
    );

    if (isChecked) {
      currentProducts.forEach((p) => this.selectedIds.add(p.id));
    } else {
      currentProducts.forEach((p) => this.selectedIds.delete(p.id));
    }
  }

  public async deleteSelected(): Promise<void> {
    if (this.selectedIds.size === 0) return;

    const isConfirmed = await this.confirmDialogService.confirm({
      title: 'Delete Product',
      message:
        'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
    });

    if (isConfirmed) {
      this.loadingSubject.next(true);
      const ids = Array.from(this.selectedIds);

      this.productManagerService.deleteBulkProducts(ids).subscribe({
        next: (results: any[]) => {
          const deactivatedCount = results.filter(
            (r) => r.status === 'DEACTIVATED',
          ).length;
          const deletedCount = results.length - deactivatedCount;

          if (deactivatedCount > 0) {
            this.toastService.showError(
              `${deactivatedCount} products could not be permanently deleted due to existing stock or linked data. Status changed to Inactive.`,
            );
          }
          if (deletedCount > 0) {
            this.toastService.showSuccess(
              `Permanently deleted ${deletedCount} products.`,
            );
          }

          this.selectedIds.clear();
          this.fetchProducts();
        },
        error: (err) => {
          console.error('Error deleting products', err);
          const msg = Array.isArray(err.error?.message)
            ? err.error.message[0]
            : err.error?.message || 'Error deleting products';
          this.toastService.showError(msg);
          this.loadingSubject.next(false);
        },
      });
    }
  }

  public fetchProducts(): void {
    this.loadingSubject.next(true);
    this.productManagerService.getProducts().subscribe({
      next: (data) => {
        this.allProductsSubject.next(data);
        this.loadingSubject.next(false);
      },
      error: (err) => {
        console.error('Error fetching products', err);
        this.loadingSubject.next(false);
      },
    });
  }

  public navigateToAddProduct(): void {
    this.router.navigate(['/manager/products/add']);
  }

  public navigateToViewProduct(id: string): void {
    this.router.navigate(['/manager/products/view', id]);
  }

  public navigateToEditProduct(id: string): void {
    this.router.navigate(['/manager/products/edit', id]);
  }

  public changePage(page: number): void {
    this.currentPageSubject.next(page);
    this.selectedIds.clear(); // Clear selection when page changes
  }
}
