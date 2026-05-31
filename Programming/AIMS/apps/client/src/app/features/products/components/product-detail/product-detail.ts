import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  isUnavailableProductStatus,
  ProductDetail,
  ProductDimensions,
} from '../../models/product.model';
import { ProductSpecificInfoComponent } from '../product-specific-info/product-specific-info';

/**
 * Module: ProductDetailComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component renders common product detail fields.
 * OCP: Satisfied. Product-type-specific rendering is delegated to ProductSpecificInfoComponent.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It receives only ProductDetail data needed for display.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep API calls and route state outside this component.
 */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ProductSpecificInfoComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetailComponent {
  @Input({ required: true }) product!: ProductDetail;

  imageLoadFailed = false;

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
}
