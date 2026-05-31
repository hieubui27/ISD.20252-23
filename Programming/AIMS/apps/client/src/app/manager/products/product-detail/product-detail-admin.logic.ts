import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductManagerService } from '../services/product-manager.service';
import { ProductDetail } from '../../../features/products/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductDetailAdminLogic {
  private router = inject(Router);
  private productManagerService = inject(ProductManagerService);

  private productSubject = new BehaviorSubject<ProductDetail | null>(null);
  public product$: Observable<ProductDetail | null> =
    this.productSubject.asObservable();

  public fetchProductDetail(id: string): void {
    this.productManagerService.getProductById(id).subscribe({
      next: (data) => this.productSubject.next(data),
      error: (err) => console.error('Error fetching product detail', err),
    });
  }

  public navigateToCatalog(): void {
    this.router.navigate(['/manager/products']);
  }

  public navigateToEdit(id: string): void {
    this.router.navigate(['/manager/products/edit', id]);
  }

  public deleteProduct(id: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productManagerService.deleteProduct(id).subscribe({
        next: () => this.navigateToCatalog(),
        error: (err) => console.error('Error deleting product', err),
      });
    }
  }
}
