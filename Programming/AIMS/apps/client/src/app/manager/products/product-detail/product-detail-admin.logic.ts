import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductManagerService } from '../services/product-manager.service';
import { ProductDetail } from '../../../features/products/models/product.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';

@Injectable({ providedIn: 'root' })
export class ProductDetailAdminLogic {
  private router = inject(Router);
  private productManagerService = inject(ProductManagerService);
  private toastService = inject(ToastService);
  private confirmDialogService = inject(ConfirmDialogService);

  private productSubject = new BehaviorSubject<ProductDetail | null>(null);
  public product$: Observable<ProductDetail | null> =
    this.productSubject.asObservable();

  public fetchProductDetail(id: string): void {
    this.productManagerService.getProductById(id).subscribe({
      next: (data) => this.productSubject.next(data),
      error: (err) => console.error('Error fetching product detail', err),
    });
  }

  private showAdjustModalSubject = new BehaviorSubject<boolean>(false);
  public showAdjustModal$: Observable<boolean> =
    this.showAdjustModalSubject.asObservable();

  public openAdjustModal(): void {
    this.showAdjustModalSubject.next(true);
  }

  public closeAdjustModal(): void {
    this.showAdjustModalSubject.next(false);
  }

  public confirmAdjustQuantity(newQuantityStr: string, reason: string): void {
    const newQuantity = parseInt(newQuantityStr, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      this.toastService.showError('Vui lòng nhập số lượng hợp lệ.');
      return;
    }
    if (!reason.trim()) {
      this.toastService.showError('Vui lòng nhập lý do điều chỉnh.');
      return;
    }

    const currentProduct = this.productSubject.value;
    if (currentProduct) {
      const payload = { quantity: newQuantity };
      this.productManagerService
        .updateProduct(currentProduct.id, payload)
        .subscribe({
          next: (updatedProduct) => {
            this.productSubject.next(updatedProduct);
            this.closeAdjustModal();
            this.toastService.showSuccess('Cập nhật số lượng thành công!');
          },
          error: (err) => {
            console.error('Error updating quantity', err);
            this.toastService.showError('Có lỗi xảy ra khi cập nhật số lượng.');
          },
        });
    }
  }

  public navigateToCatalog(): void {
    this.router.navigate(['/manager/products']);
  }

  public navigateToEdit(id: string): void {
    this.router.navigate(['/manager/products/edit', id]);
  }

  public async deleteProduct(id: string): Promise<void> {
    const isConfirmed = await this.confirmDialogService.confirm({
      title: 'Delete Product',
      message:
        'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
    });

    if (isConfirmed) {
      this.productManagerService.deleteProduct(id).subscribe({
        next: (res: any) => {
          if (res && res.status === 'DEACTIVATED') {
            this.toastService.showError(
              'Sản phẩm không thể xóa do còn tồn kho. Đã chuyển sang trạng thái Ngưng Hoạt Động.',
            );
          } else {
            this.toastService.showSuccess('Đã xóa sản phẩm thành công');
          }
          this.navigateToCatalog();
        },
        error: (err) => {
          console.error(err);
          const msg = Array.isArray(err.error?.message)
            ? err.error.message[0]
            : err.error?.message || 'Có lỗi xảy ra khi xóa sản phẩm';
          this.toastService.showError(msg);
        },
      });
    }
  }
}
