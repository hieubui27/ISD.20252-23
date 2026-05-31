import { ProductTypeValue } from '../enums/product-type.enum';

export type ProductDimensions = {
  height: number;
  width: number;
  length: number;
};

/**
 * Module: ProductEntity
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This entity represents common product state used by read use cases.
 * OCP: Satisfied. Type-specific fields are kept outside this common entity contract.
 * LSP: Satisfied. Product subtypes can preserve this base contract without fake fields.
 * ISP: Satisfied. Consumers depend only on common product fields they need for reading.
 * DIP: Not applicable. This entity does not depend on infrastructure services.
 *
 * Improvement Direction:
 * Keep only common product fields here and put Book, Newspaper, CD, and DVD fields into specificInfo DTOs.
 */
export class ProductEntity {
  id!: string;
  barcode!: string;
  title!: string;
  type!: ProductTypeValue;
  currentPrice!: number;
  originalValue!: number;
  description!: string;
  weight!: number;
  dimensions!: ProductDimensions;
  imageUrl?: string;
  stockQuantity!: number;
  status!: string;

  constructor(partial: Partial<ProductEntity>) {
    Object.assign(this, partial);
  }
}
