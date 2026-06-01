import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AimsFooterComponent } from '../../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../../shared/layout/aims-header/aims-header';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../shared/ui/aims-icon/aims-icon';
import { StatusMessageComponent } from '../../shared/ui/status-message/status-message';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { Product, ProductSelection } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';
import { CartStoreService } from '../../cart/services/cart-store.service';

@Component({
  selector: 'app-product-selection',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    AimsFooterComponent,
    AimsHeaderComponent,
    RouterLink,
    StatusMessageComponent,
    AimsIconComponent,
  ],
  templateUrl: './product-selection.html',
  styleUrl: './product-selection.scss',
})
export class ProductSelectionComponent implements OnInit {
  products: Product[] = [];
  totalProducts = 0;
  selectedItems = new Map<string, ProductSelection>();
  failedImageIds = new Set<string>();
  isLoading = false;
  isCreatingPayment = false;
  errorMessage = '';

  private readonly productApi = inject(ProductApiService);
  private readonly checkoutDraft = inject(CheckoutDraftService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly cartCount = inject(CartStoreService).count;

  ngOnInit(): void {
    this.checkoutDraft.clear();
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productApi.findAll().subscribe({
      next: (products) => {
        this.failedImageIds.clear();
        this.products = products;
        this.totalProducts = products.length;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load products failed:', err);
        this.isLoading = false;
        this.errorMessage =
          err.error?.message || err.message || 'Unable to load products.';
        this.cdr.detectChanges();
      },
    });
  }

  selectProduct(product: Product): void {
    const existing = this.selectedItems.get(product.id);
    const nextQuantity = existing ? existing.quantity + 1 : 1;
    this.updateQuantity(product, nextQuantity);
  }

  updateQuantity(product: Product, quantity: number): void {
    const normalizedQuantity = Math.max(
      0,
      Math.min(quantity, product.quantity),
    );

    if (normalizedQuantity === 0) {
      this.selectedItems.delete(product.id);
      return;
    }

    this.selectedItems.set(product.id, {
      productId: Number(product.id),
      title: product.title,
      quantity: normalizedQuantity,
      unitPrice: this.toNumber(product.currentPrice),
      imageUrl: product.imageUrl,
    });
  }

  getQuantity(product: Product): number {
    return this.selectedItems.get(product.id)?.quantity || 0;
  }

  hasImagePreview(product: Product): boolean {
    const imageUrl = product.imageUrl?.trim();

    return Boolean(
      imageUrl &&
        imageUrl.toUpperCase() !== 'N/A' &&
        !this.failedImageIds.has(product.id),
    );
  }

  markImageFailed(product: Product): void {
    this.failedImageIds.add(product.id);
  }

  get selectedList(): ProductSelection[] {
    return Array.from(this.selectedItems.values());
  }

  get subtotal(): number {
    return this.selectedList.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
  }

  proceedToPayment(): void {
    if (this.selectedItems.size === 0) {
      this.errorMessage = 'Select at least one available product.';
      return;
    }

    const draft: CheckoutDraft = {
      items: this.selectedList,
      deliveryInfo: {
        receiverName: '',
        phoneNumber: '',
        email: '',
        province: '',
        streetAddress: '',
        shippingInstructions: '',
      },
    };

    this.checkoutDraft.save(draft);
    this.errorMessage = '';
    this.router.navigate(['/delivery']);
  }

  goToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  formatPrice(value: number | string): string {
    return `${this.toNumber(value).toLocaleString('vi-VN')} VND`;
  }

  private isAvailable(product: Product): boolean {
    const status = String(product.status).toUpperCase();
    return (
      product.quantity > 0 &&
      status !== 'DEACTIVATED' &&
      status !== 'DELETED' &&
      status !== 'INACTIVE' &&
      status !== 'UNAVAILABLE'
    );
  }

  private toNumber(value: number | string): number {
    return Number(value);
  }
}
