import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProductManagerService } from '../services/product-manager.service';
import { ProductListItem } from '../../../features/products/models/product.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductListLogic {
  private router = inject(Router);
  private productManagerService = inject(ProductManagerService);

  private productsSubject = new BehaviorSubject<ProductListItem[]>([]);
  public products$: Observable<ProductListItem[]> =
    this.productsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  public fetchProducts(): void {
    this.loadingSubject.next(true);
    this.productManagerService.getProducts().subscribe({
      next: (data) => {
        this.productsSubject.next(data);
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
}
