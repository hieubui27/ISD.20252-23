import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CDSpecificInfo } from '../../models/product.model';

/**
 * Module: CDSpecificInfoComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This component only renders CD-specific product information.
 * OCP: Satisfied. CD rendering can evolve without changing other type components.
 * LSP: Satisfied. It follows the same input-only presentational contract as other specific components.
 * ISP: Satisfied. It receives only CDSpecificInfo fields.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Keep CD-only labels and formatting here.
 */
@Component({
  selector: 'app-cd-specific-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cd-specific-info.html',
})
export class CDSpecificInfoComponent {
  @Input({ required: true }) info!: CDSpecificInfo;

  listText(items: string[]): string {
    return items.length > 0 ? items.join(', ') : 'N/A';
  }
}
