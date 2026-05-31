import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductManagerService } from '../services/product-manager.service';
import { ProductDetail } from '../../../features/products/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductFormLogic {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productManagerService = inject(ProductManagerService);

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private isEditModeSubject = new BehaviorSubject<boolean>(false);
  public isEditMode$: Observable<boolean> =
    this.isEditModeSubject.asObservable();

  private productId: string | null = null;

  public form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    type: ['BOOK', Validators.required],
    description: [''],
    currentPrice: [0, [Validators.required, Validators.min(0)]],
    originalValue: [0, Validators.min(0)],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    status: ['ACTIVE', Validators.required],
    barcode: [''],
    weight: [0],
  });

  public initForm(id: string | null): void {
    if (id) {
      this.isEditModeSubject.next(true);
      this.productId = id;
      this.loadingSubject.next(true);
      this.productManagerService.getProductById(id).subscribe({
        next: (product) => {
          this.form.patchValue(product);
          this.loadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error fetching product for edit', err);
          this.loadingSubject.next(false);
        },
      });
    } else {
      this.isEditModeSubject.next(false);
      this.productId = null;
      this.form.reset({
        type: 'BOOK',
        status: 'ACTIVE',
        currentPrice: 0,
        originalValue: 0,
        stockQuantity: 0,
        weight: 0,
      });
    }
  }

  public saveProduct(): void {
    if (this.form.invalid) return;

    this.loadingSubject.next(true);
    const payload = this.form.value;

    if (this.isEditModeSubject.value && this.productId) {
      this.productManagerService
        .updateProduct(this.productId, payload)
        .subscribe({
          next: () => this.navigateToCatalog(),
          error: (err) => {
            console.error('Error updating product', err);
            this.loadingSubject.next(false);
          },
        });
    } else {
      this.productManagerService.createProduct(payload).subscribe({
        next: () => this.navigateToCatalog(),
        error: (err) => {
          console.error('Error creating product', err);
          this.loadingSubject.next(false);
        },
      });
    }
  }

  public navigateToCatalog(): void {
    this.router.navigate(['/manager/products']);
  }
}
