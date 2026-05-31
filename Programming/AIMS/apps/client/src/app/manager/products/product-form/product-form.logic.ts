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
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const currentImages = this.imageUrlsSubject.value;
        this.imageUrlsSubject.next([...currentImages, e.target.result]);
      };
      reader.readAsDataURL(file);
    }
  }

  public removeImage(index: number): void {
    const currentImages = this.imageUrlsSubject.value;
    currentImages.splice(index, 1);
    this.imageUrlsSubject.next([...currentImages]);
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
    payload.imageUrl = images.length > 0 ? images[0] : 'N/A';
    payload.imageUrls = images;

    payload.barcode = payload.barcode || 'N/A';
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
        next: () => {
          this.toastService.showSuccess('Tạo mới sản phẩm thành công!');
          this.navigateToCatalog();
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
