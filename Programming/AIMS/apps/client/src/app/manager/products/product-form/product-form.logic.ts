import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductManagerService } from '../services/product-manager.service';
import {
  ProductDetail,
  ProductType,
} from '../../../features/products/models/product.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/**
 * Logic: ProductFormLogic
 *
 * SOLID Review:
 * SRP: Satisfied. This class manages form state and orchestrates save/upload workflows.
 * OCP: Satisfied. Upload logic is added as new methods without modifying existing form initialization.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Exposes only form-related observables and methods to the component.
 * DIP: Satisfied. Depends on injected ProductManagerService and ToastService abstractions.
 *
 * + Coupling/Cohesion level: Data Coupling / Sequential Cohesion
 * + Reason why: Data Coupling because it communicates with services via simple data parameters.
 *   Sequential Cohesion because the upload and save operations form a logical sequence.
 */

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable({ providedIn: 'root' })
export class ProductFormLogic {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productManagerService = inject(ProductManagerService);
  private toastService = inject(ToastService);

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

  /** File pending upload (used in create mode before product ID exists) */
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

  constructor() {
    this.updateSpecificInfoForm('BOOK');
    this.form.get('type')?.valueChanges.subscribe((type) => {
      this.updateSpecificInfoForm(type);
    });
  }

  private updateSpecificInfoForm(
    type: ProductType,
    initialData: any = {},
  ): void {
    let specificInfoGroup: FormGroup;
    switch (type) {
      case 'BOOK':
        specificInfoGroup = this.fb.group({
          authors: [initialData.authors || ''],
          coverType: [initialData.coverType || ''],
          publisher: [initialData.publisher || ''],
          publicationDate: [initialData.publicationDate || ''],
          numberOfPages: [initialData.numberOfPages || 0],
          language: [initialData.language || ''],
          genre: [initialData.genre || ''],
        });
        break;
      case 'NEWSPAPER':
        specificInfoGroup = this.fb.group({
          editorInChief: [initialData.editorInChief || ''],
          publisher: [initialData.publisher || ''],
          publicationDate: [initialData.publicationDate || ''],
          issueNumber: [initialData.issueNumber || ''],
          releaseFrequency: [initialData.releaseFrequency || ''],
          issn: [initialData.issn || ''],
          language: [initialData.language || ''],
          sections: [initialData.sections || ''],
        });
        break;
      case 'CD':
        specificInfoGroup = this.fb.group({
          artists: [initialData.artists || ''],
          recordLabel: [initialData.recordLabel || ''],
          trackList: [initialData.trackList || ''],
          genre: [initialData.genre || ''],
          releaseDate: [initialData.releaseDate || ''],
        });
        break;
      case 'DVD':
        specificInfoGroup = this.fb.group({
          discType: [initialData.discType || ''],
          director: [initialData.director || ''],
          runtime: [initialData.runtime || 0],
          studio: [initialData.studio || ''],
          language: [initialData.language || ''],
          subtitles: [initialData.subtitles || ''],
          releaseDate: [initialData.releaseDate || ''],
          genre: [initialData.genre || ''],
        });
        break;
      default:
        specificInfoGroup = this.fb.group({});
    }
    this.form.setControl('specificInfo', specificInfoGroup);
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
          if (productData.specificInfo) {
            if (
              productData.type === 'BOOK' &&
              productData.specificInfo.authors
            ) {
              productData.specificInfo.authors =
                productData.specificInfo.authors.join(', ');
            }
            if (
              productData.type === 'NEWSPAPER' &&
              productData.specificInfo.sections
            ) {
              productData.specificInfo.sections =
                productData.specificInfo.sections.join(', ');
            }
            if (productData.type === 'CD') {
              if (productData.specificInfo.artists)
                productData.specificInfo.artists =
                  productData.specificInfo.artists.join(', ');
              if (productData.specificInfo.trackList)
                productData.specificInfo.trackList =
                  productData.specificInfo.trackList.join(', ');
            }
            if (
              productData.type === 'DVD' &&
              productData.specificInfo.subtitles
            ) {
              productData.specificInfo.subtitles =
                productData.specificInfo.subtitles.join(', ');
            }
          }
          this.updateSpecificInfoForm(
            productData.type,
            productData.specificInfo,
          );
          this.form.patchValue(productData);

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

  /**
   * Validates and handles file selection.
   * In edit mode: uploads immediately to Cloudinary via backend.
   * In create mode: stores the file and shows a local preview until save.
   *
   * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
   * + Reason why: Data Coupling because it only interacts with the file event data.
   *   Functional Cohesion because it performs one task: processing the selected image file.
   */
  public onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.toastService.showError(
        'Định dạng ảnh không hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP, GIF.',
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.toastService.showError('Kích thước ảnh vượt quá giới hạn 10MB.');
      return;
    }

    if (this.isEditModeSubject.value && this.productId) {
      // Edit mode: upload immediately
      this.uploadImageFile(file, this.productId);
    } else {
      // Create mode: show local preview and store file for later upload
      this.pendingFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrlsSubject.next([e.target.result]);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Uploads a file to Cloudinary via the backend and updates the image preview.
   *
   * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
   * + Reason why: Data Coupling because it passes simple data (file, productId) to the service.
   *   Functional Cohesion because it performs one task: uploading an image and updating state.
   */
  private uploadImageFile(file: File, productId: string): void {
    this.uploadingImageSubject.next(true);
    this.productManagerService.uploadImage(productId, file).subscribe({
      next: (response) => {
        this.imageUrlsSubject.next([response.imageUrl]);
        this.uploadingImageSubject.next(false);
        this.toastService.showSuccess('Tải ảnh lên thành công!');
      },
      error: (err) => {
        console.error('Error uploading image', err);
        this.uploadingImageSubject.next(false);
        this.toastService.showError('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
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
      this.toastService.showError(
        'Vui lòng kiểm tra lại các trường thông tin không hợp lệ.',
      );
      return;
    }

    this.loadingSubject.next(true);
    const payload = { ...this.form.value };

    const images = this.imageUrlsSubject.value;
    // In create mode with a pending file, use placeholder — the real URL
    // will be set after upload. Avoids sending large base64 in JSON body.
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

    if (payload.specificInfo) {
      if (payload.type === 'BOOK') {
        if (payload.specificInfo.authors)
          payload.specificInfo.authors = payload.specificInfo.authors
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        payload.specificInfo.nbPages =
          Number(payload.specificInfo.numberOfPages) || 0;
        delete payload.specificInfo.numberOfPages;
        if (payload.specificInfo.publicationDate)
          payload.specificInfo.publishDate =
            payload.specificInfo.publicationDate;
        delete payload.specificInfo.publicationDate;
      }
      if (payload.type === 'NEWSPAPER') {
        if (payload.specificInfo.sections)
          payload.specificInfo.sections = payload.specificInfo.sections
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        payload.specificInfo.publicationFreq =
          payload.specificInfo.releaseFrequency;
        delete payload.specificInfo.releaseFrequency;
        if (payload.specificInfo.publicationDate)
          payload.specificInfo.publishDate =
            payload.specificInfo.publicationDate;
        delete payload.specificInfo.publicationDate;
      }
      if (payload.type === 'CD') {
        if (payload.specificInfo.artists) {
          const artists = payload.specificInfo.artists
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          payload.specificInfo.artist = artists.join(', ');
          delete payload.specificInfo.artists;
        }
        if (payload.specificInfo.trackList) {
          const tracks = payload.specificInfo.trackList
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          payload.specificInfo.track = tracks.join(', ');
          delete payload.specificInfo.trackList;
        }
        if (!payload.specificInfo.releaseDate)
          delete payload.specificInfo.releaseDate;
      }
      if (payload.type === 'DVD') {
        if (payload.specificInfo.subtitles) {
          const subs = payload.specificInfo.subtitles
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          payload.specificInfo.subtitles = subs.join(', ');
        }
        payload.specificInfo.totalLength =
          Number(payload.specificInfo.runtime) || 0;
        delete payload.specificInfo.runtime;
        if (!payload.specificInfo.releaseDate)
          delete payload.specificInfo.releaseDate;
      }
      Object.assign(payload, payload.specificInfo);
      delete payload.specificInfo;
    }

    payload.quantity = Number(payload.stockQuantity) || 0;
    delete payload.stockQuantity;
    payload.category = payload.type;
    payload.videoUrl = 'N/A';

    if (this.isEditModeSubject.value && this.productId) {
      this.productManagerService
        .updateProduct(this.productId, payload)
        .subscribe({
          next: () => {
            this.toastService.showSuccess('Cập nhật sản phẩm thành công!');
            this.navigateToCatalog();
          },
          error: (err) => {
            console.error('Error updating product', err);
            this.toastService.showError(
              'Lỗi khi cập nhật sản phẩm. Vui lòng thử lại.',
            );
            this.loadingSubject.next(false);
          },
        });
    } else {
      this.productManagerService.createProduct(payload).subscribe({
        next: (createdProduct: any) => {
          const newProductId = createdProduct?.id?.toString();

          // If there's a pending file and we have the new product ID, upload it
          if (this.pendingFile && newProductId) {
            this.uploadingImageSubject.next(true);
            this.productManagerService
              .uploadImage(newProductId, this.pendingFile)
              .subscribe({
                next: () => {
                  this.pendingFile = null;
                  this.uploadingImageSubject.next(false);
                  this.toastService.showSuccess(
                    'Tạo mới sản phẩm và tải ảnh thành công!',
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
                    'Tạo sản phẩm thành công nhưng tải ảnh thất bại.',
                  );
                  this.navigateToCatalog();
                },
              });
          } else {
            this.toastService.showSuccess('Tạo mới sản phẩm thành công!');
            this.navigateToCatalog();
          }
        },
        error: (err) => {
          console.error('Error creating product', err);
          this.toastService.showError(
            'Lỗi khi tạo sản phẩm. Vui lòng thử lại.',
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
