import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  isUnavailableProductStatus,
  ProductListItem,
} from '../../models/product.model';

/**
 * Module: ProductCardComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component only renders one product card and navigation target.
 * OCP: Satisfied. It renders common card fields without product-type-specific branches.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It receives only ProductListItem fields needed for the card.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep data fetching out of this component and delegate detail navigation to the router.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductListItem;

  imageLoadFailed = false;

  get hasNoticeStatus(): boolean {
    return isUnavailableProductStatus(this.product.status);
  }

  onImageError(): void {
    this.imageLoadFailed = true;
  }
}
