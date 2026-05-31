import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NewspaperSpecificInfo } from '../../models/product.model';

/**
 * Module: NewspaperSpecificInfoComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component only renders Newspaper-specific product information.
 * OCP: Satisfied. Newspaper rendering can evolve without changing other type components.
 * LSP: Satisfied. It follows the same input-only presentational contract as other specific components.
 * ISP: Satisfied. It receives only NewspaperSpecificInfo fields.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep Newspaper-only labels and formatting here.
 */
@Component({
  selector: 'app-newspaper-specific-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './newspaper-specific-info.html',
})
export class NewspaperSpecificInfoComponent {
  @Input({ required: true }) info!: NewspaperSpecificInfo;

  listText(items: string[]): string {
    return items.length > 0 ? items.join(', ') : 'N/A';
  }
}
