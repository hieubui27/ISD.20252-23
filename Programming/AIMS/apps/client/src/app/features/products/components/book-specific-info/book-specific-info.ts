import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BookSpecificInfo } from '../../models/product.model';

/**
 * Module: BookSpecificInfoComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component only renders Book-specific product information.
 * OCP: Satisfied. Book rendering can evolve without changing other type components.
 * LSP: Satisfied. It follows the same input-only presentational contract as other specific components.
 * ISP: Satisfied. It receives only BookSpecificInfo fields.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep Book-only labels and formatting here.
 */
@Component({
  selector: 'app-book-specific-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-specific-info.html',
  styleUrl: '../product-specific-info/specific-info-grid.scss',
})
export class BookSpecificInfoComponent {
  @Input({ required: true }) info!: BookSpecificInfo;

  listText(items: string[]): string {
    return items.length > 0 ? items.join(', ') : 'N/A';
  }
}
