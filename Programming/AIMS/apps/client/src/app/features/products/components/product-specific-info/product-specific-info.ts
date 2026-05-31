import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  BookSpecificInfo,
  CDSpecificInfo,
  DVDSpecificInfo,
  NewspaperSpecificInfo,
  ProductDetail,
} from '../../models/product.model';
import { BookSpecificInfoComponent } from '../book-specific-info/book-specific-info';
import { CDSpecificInfoComponent } from '../cd-specific-info/cd-specific-info';
import { DVDSpecificInfoComponent } from '../dvd-specific-info/dvd-specific-info';
import { NewspaperSpecificInfoComponent } from '../newspaper-specific-info/newspaper-specific-info';

/**
 * Module: ProductSpecificInfoComponent
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied if it only renders type-specific product information.
 * OCP: Partially satisfied. Avoid long if-else/switch blocks when adding new product types.
 * LSP: Satisfied if all specific info components follow a consistent input contract.
 * ISP: Satisfied if each child component receives only the data it displays.
 * DIP: Not applicable for this presentational component.
 *
 * Improvement Direction:
 * Split Book, Newspaper, CD, and DVD rendering into dedicated components and keep this component as a small dispatcher.
 */
@Component({
  selector: 'app-product-specific-info',
  standalone: true,
  imports: [
    CommonModule,
    BookSpecificInfoComponent,
    NewspaperSpecificInfoComponent,
    CDSpecificInfoComponent,
    DVDSpecificInfoComponent,
  ],
  templateUrl: './product-specific-info.html',
  styleUrl: './product-specific-info.scss',
})
export class ProductSpecificInfoComponent {
  @Input({ required: true }) product!: ProductDetail;

  get bookInfo(): BookSpecificInfo {
    return this.product.specificInfo as BookSpecificInfo;
  }

  get newspaperInfo(): NewspaperSpecificInfo {
    return this.product.specificInfo as NewspaperSpecificInfo;
  }

  get cdInfo(): CDSpecificInfo {
    return this.product.specificInfo as CDSpecificInfo;
  }

  get dvdInfo(): DVDSpecificInfo {
    return this.product.specificInfo as DVDSpecificInfo;
  }
}
