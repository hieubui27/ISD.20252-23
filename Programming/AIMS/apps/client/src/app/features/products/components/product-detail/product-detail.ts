import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BookSpecificInfo,
  CDSpecificInfo,
  DVDSpecificInfo,
  isUnavailableProductStatus,
  NewspaperSpecificInfo,
  ProductDetail,
  ProductDimensions,
} from '../../models/product.model';
import { StatusMessageComponent } from '../../../../shared/ui/status-message/status-message';
import { ProductSpecificInfoComponent } from '../product-specific-info/product-specific-info';
import { CartStoreService } from '../../../../cart/services/cart-store.service';
import { AimsButtonComponent } from '../../../../shared/ui/aims-button/aims-button';

/**
 * Module: ProductDetailComponent
 * Use Case: UC235 - View Product Detail / UC-Cart - Add To Cart
 *
 * SOLID Review:
 * SRP: Renders common product detail fields and owns the local add-to-cart
 *   quantity selector. Cart state is delegated to CartStoreService.
 * OCP: Satisfied. Product-type-specific rendering is delegated to ProductSpecificInfoComponent.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It receives only ProductDetail data needed for display.
 * DIP: Cart persistence is delegated to CartStoreService rather than touching localStorage here.
 *
 * Improvement Direction:
 * Keep API calls and route state outside this component.
 */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    ProductSpecificInfoComponent,
    StatusMessageComponent,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetailComponent {
  @Input({ required: true }) product!: ProductDetail;

  imageLoadFailed = false;

  readonly quantity = signal(1);
  readonly justAdded = signal(false);

  private readonly cartStore = inject(CartStoreService);
  private readonly router = inject(Router);

  get maxQuantity(): number {
    return Math.max(0, Number(this.product.stockQuantity) || 0);
  }

  get canAddToCart(): boolean {
    return !this.isUnavailableStatus(this.product.status) && this.maxQuantity > 0;
  }

  increaseQuantity(): void {
    this.quantity.update((value) => Math.min(value + 1, this.maxQuantity || 1));
  }

  decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  addToCart(): void {
    if (!this.canAddToCart) return;

    this.cartStore.add(
      {
        productId: Number(this.product.id),
        title: this.product.title,
        unitPrice: Number(this.product.currentPrice) || 0,
        imageUrl: this.product.imageUrl,
        type: this.product.type,
      },
      this.quantity(),
    );

    this.justAdded.set(true);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  summarySpecs(): Array<{ label: string; value: string }> {
    switch (this.product.type) {
      case 'BOOK': {
        const info = this.product.specificInfo as BookSpecificInfo;
        return [
          { label: 'Publisher', value: this.displayValue(info.publisher) },
          { label: 'Pages', value: this.displayValue(info.numberOfPages) },
          { label: 'Language', value: this.displayValue(info.language) },
          { label: 'Genre', value: this.displayValue(info.genre) },
        ];
      }
      case 'NEWSPAPER': {
        const info = this.product.specificInfo as NewspaperSpecificInfo;
        return [
          { label: 'Publisher', value: this.displayValue(info.publisher) },
          { label: 'Issue', value: this.displayValue(info.issueNumber) },
          { label: 'ISSN', value: this.displayValue(info.issn) },
          { label: 'Language', value: this.displayValue(info.language) },
        ];
      }
      case 'CD': {
        const info = this.product.specificInfo as CDSpecificInfo;
        return [
          { label: 'Artist', value: this.listText(info.artists) },
          { label: 'Tracks', value: this.displayValue(info.trackList?.length) },
          { label: 'Label', value: this.displayValue(info.recordLabel) },
          { label: 'Genre', value: this.displayValue(info.genre) },
        ];
      }
      case 'DVD': {
        const info = this.product.specificInfo as DVDSpecificInfo;
        return [
          { label: 'Format', value: this.displayValue(info.discType) },
          { label: 'Runtime', value: this.displayValue(info.runtime) },
          { label: 'Studio', value: this.displayValue(info.studio) },
          { label: 'Language', value: this.displayValue(info.language) },
        ];
      }
    }
  }

  isUnavailableStatus(status: string): boolean {
    return isUnavailableProductStatus(status);
  }

  statusNotice(status: string): string {
    const normalized = status.toUpperCase();

    if (normalized === 'OUT_OF_STOCK') {
      return 'This product is out of stock.';
    }

    if (normalized === 'DEACTIVATED') {
      return 'This product is deactivated.';
    }

    if (normalized === 'UNAVAILABLE') {
      return 'This product is unavailable.';
    }

    return 'This product is currently not available for purchase.';
  }

  dimensionText(dimensions: ProductDimensions): string {
    return `${dimensions.height} x ${dimensions.width} x ${dimensions.length}`;
  }

  onImageError(): void {
    this.imageLoadFailed = true;
  }

  private displayValue(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    return String(value);
  }

  private listText(items: string[] | null | undefined): string {
    return items && items.length > 0 ? items.join(', ') : 'N/A';
  }
}
