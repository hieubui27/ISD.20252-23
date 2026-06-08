import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductManagerService } from '../services/product-manager.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ProductFormFactory } from './product-form.factory';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * [SOLID Violation in Old Design]
 * Violated Principle: OCP & SRP
 * Code Section: ProductFormLogic (updateSpecificInfoForm, saveProduct, initForm)
 * Why:
 * 1. OCP: The old implementation had giant `switch-case` and `if-else` blocks checking for `BOOK`, `CD`, `DVD`, `NEWSPAPER` to build specific forms and map payloads. Adding a new product type like Clothing would require modifying multiple parts of this file.
 * 2. SRP: This class managed form state, upload workflow, AND the specific payload mapping for all types.
 * Proposed solution direction / Refactored:
 * Extracted the product-specific configurations and mapping logic into Strategy classes (`BookFormConfig`, etc.). Used `ProductFormFactory` to dynamically retrieve the configuration based on product type, removing all `switch-case` blocks.
 */
@Injectable({ providedIn: 'root' })
export class ProductFormLogic {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productManagerService = inject(ProductManagerService);
  private toastService = inject(ToastService);
  private formFactory = inject(ProductFormFactory);

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private isEditModeSubject = new BehaviorSubject<boolean>(false);
  public isEditMode$: Observable<boolean> =
    this.isEditModeSubject.asObservable();

  private imageUrlsSubject = new BehaviorSubject<string[]>([]);
  public imageUrls$: Observable<string[]> =
    this.imageUrlsSubject.asObservable();

  private uploadingImageSubject = new BehaviorSubject<boolean>(false);
  public uploadingImage$: Observable<boolean> =
    this.uploadingImageSubject.asObservable();

  private productId: string | null = null;
  private pendingFile: File | null = null;

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
    specificInfo: this.fb.group({}),
  });

  public get productTypes() {
    return this.formFactory.getAllTypes();
  }

  constructor() {
    this.updateSpecificInfoForm('BOOK');
    this.form.get('type')?.valueChanges.subscribe((type) => {
      this.updateSpecificInfoForm(type);
    });
  }

  private updateSpecificInfoForm(type: string, initialData: any = {}): void {
    const config = this.formFactory.getConfig(type);
    const specificGroup = this.fb.group({});

    config.fields.forEach((field) => {
      specificGroup.addControl(
        field.name,
        new FormControl(initialData[field.name] || ''),
      );
    });

    this.form.setControl('specificInfo', specificGroup);
  }

  public initForm(id: string | null): void {
    if (id) {
      this.isEditModeSubject.next(true);
      this.productId = id;
      this.pendingFile = null;
      this.loadingSubject.next(true);
      this.productManagerService.getProductById(id).subscribe({
        next: (product) => {
          const productData = { ...product } as any;
          const config = this.formFactory.getConfig(productData.type);

          const mappedSpecificInfo = config.mapToForm(productData.specificInfo);
          this.updateSpecificInfoForm(productData.type, mappedSpecificInfo);

          this.form.patchValue({
            ...productData,
            specificInfo: mappedSpecificInfo,
          });

          const images =
            productData.imageUrls ||
            (productData.imageUrl ? [productData.imageUrl] : []);
          this.imageUrlsSubject.next([...images]);

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
      this.pendingFile = null;
      this.updateSpecificInfoForm('BOOK');
      this.form.reset({
        type: 'BOOK',
        status: 'ACTIVE',
        currentPrice: 0,
        originalValue: 0,
        stockQuantity: 0,
        weight: 0,
      });
      this.imageUrlsSubject.next([]);
    }
  }

  public onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.toastService.showError(
        'Unsupported image format. Only JPEG, PNG, WebP, and GIF are allowed.',
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.toastService.showError('Image size exceeds the 10MB limit.');
      return;
    }

    if (this.isEditModeSubject.value && this.productId) {
      this.uploadImageFile(file, this.productId);
    } else {
      this.pendingFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrlsSubject.next([e.target.result]);
      };
      reader.readAsDataURL(file);
    }
  }

  private uploadImageFile(file: File, productId: string): void {
    this.uploadingImageSubject.next(true);
    this.productManagerService.uploadImage(productId, file).subscribe({
      next: (response) => {
        this.imageUrlsSubject.next([response.imageUrl]);
        this.uploadingImageSubject.next(false);
        this.toastService.showSuccess('Image uploaded successfully!');
      },
      error: (err) => {
        console.error('Error uploading image', err);
        this.uploadingImageSubject.next(false);
        this.toastService.showError('Error uploading image. Please try again.');
      },
    });
  }

  public removeImage(index: number): void {
    const currentImages = this.imageUrlsSubject.value;
    currentImages.splice(index, 1);
    this.imageUrlsSubject.next([...currentImages]);
    this.pendingFile = null;
  }

  public saveProduct(): void {
    if (this.form.invalid) {
      this.toastService.showError('Please check invalid fields.');
      return;
    }

    this.loadingSubject.next(true);
    const payload = { ...this.form.value };

    const images = this.imageUrlsSubject.value;
    if (this.pendingFile && !this.isEditModeSubject.value) {
      payload.imageUrl = 'N/A';
    } else {
      payload.imageUrl = images.length > 0 ? images[0] : 'N/A';
    }
    payload.imageUrls = images;

    payload.barcode = payload.barcode || `BC-${Date.now()}`;
    payload.description = payload.description || 'N/A';
    payload.weight = Number(payload.weight) || 0;
    payload.currentPrice = Number(payload.currentPrice) || 0;
    payload.originalValue = Number(payload.originalValue) || 0;
    payload.quantity = Number(payload.stockQuantity) || 0;
    delete payload.stockQuantity;
    payload.category = payload.type;
    payload.videoUrl = 'N/A';

    if (payload.specificInfo) {
      const config = this.formFactory.getConfig(payload.type);
      const mappedSpecificInfo = config.mapToApi(payload.specificInfo);
      Object.assign(payload, mappedSpecificInfo);
      delete payload.specificInfo;
    }

    if (this.isEditModeSubject.value && this.productId) {
      this.productManagerService
        .updateProduct(this.productId, payload)
        .subscribe({
          next: () => {
            this.toastService.showSuccess('Product updated successfully!');
            this.navigateToCatalog();
          },
          error: (err) => {
            console.error('Error updating product', err);
            this.toastService.showError(
              'Error updating product. Please try again.',
            );
            this.loadingSubject.next(false);
          },
        });
    } else {
      this.productManagerService.createProduct(payload).subscribe({
        next: (createdProduct: any) => {
          const newProductId = createdProduct?.id?.toString();
          if (this.pendingFile && newProductId) {
            this.uploadingImageSubject.next(true);
            this.productManagerService
              .uploadImage(newProductId, this.pendingFile)
              .subscribe({
                next: () => {
                  this.pendingFile = null;
                  this.uploadingImageSubject.next(false);
                  this.toastService.showSuccess(
                    'Product created and image uploaded successfully!',
                  );
                  this.navigateToCatalog();
                },
                error: (uploadErr) => {
                  console.error(
                    'Error uploading image after create',
                    uploadErr,
                  );
                  this.uploadingImageSubject.next(false);
                  this.toastService.showSuccess(
                    'Product created successfully but image upload failed.',
                  );
                  this.navigateToCatalog();
                },
              });
          } else {
            this.toastService.showSuccess('Product created successfully!');
            this.navigateToCatalog();
          }
        },
        error: (err) => {
          console.error('Error creating product', err);
          this.toastService.showError(
            'Error creating product. Please try again.',
          );
          this.loadingSubject.next(false);
        },
      });
    }
  }

  public navigateToCatalog(): void {
    this.router.navigate(['/manager/products']);
  }
}
