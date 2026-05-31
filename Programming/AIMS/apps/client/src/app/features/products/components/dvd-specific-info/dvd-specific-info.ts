import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DVDSpecificInfo } from '../../models/product.model';

/**
 * Module: DVDSpecificInfoComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component only renders DVD-specific product information.
 * OCP: Satisfied. DVD rendering can evolve without changing other type components.
 * LSP: Satisfied. It follows the same input-only presentational contract as other specific components.
 * ISP: Satisfied. It receives only DVDSpecificInfo fields.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep DVD-only labels and formatting here.
 */
@Component({
  selector: 'app-dvd-specific-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dvd-specific-info.html',
  styleUrl: '../product-specific-info/specific-info-grid.scss',
})
export class DVDSpecificInfoComponent {
  @Input({ required: true }) info!: DVDSpecificInfo;

  listText(items: string[]): string {
    return items.length > 0 ? items.join(', ') : 'N/A';
  }
}
