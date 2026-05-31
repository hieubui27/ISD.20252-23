import { ProductDimensions } from '../../domain/entities/product.entity';
import { ProductTypeValue } from '../../domain/enums/product-type.enum';

export type BookSpecificInfoDto = {
  authors: string[];
  coverType: string;
  publisher: string;
  publicationDate: string;
  numberOfPages: number;
  language: string;
  genre: string;
};

export type NewspaperSpecificInfoDto = {
  editorInChief: string;
  publisher: string;
  publicationDate: string;
  issueNumber: string;
  releaseFrequency: string;
  issn: string;
  language: string;
  sections: string[];
};

export type CDSpecificInfoDto = {
  artists: string[];
  recordLabel: string;
  trackList: string[];
  genre: string;
  releaseDate: string;
};

export type DVDSpecificInfoDto = {
  discType: string;
  director: string;
  runtime: number;
  studio: string;
  language: string;
  subtitles: string[];
  releaseDate: string;
  genre: string;
};

export type ProductSpecificInfoDto =
  | BookSpecificInfoDto
  | NewspaperSpecificInfoDto
  | CDSpecificInfoDto
  | DVDSpecificInfoDto
  | Record<string, never>;

/**
 * Module: ProductDetailDto
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This DTO defines the response contract for product detail display.
 * OCP: Satisfied. Common fields remain stable while specificInfo can be extended by type.
 * LSP: Satisfied. All product detail responses preserve the same common contract.
 * ISP: Satisfied. Frontend detail views receive the read-only fields needed for display.
 * DIP: Not applicable. DTOs do not depend on persistence or framework implementations.
 *
 * Improvement Direction:
 * Add new product-type DTOs under specificInfo instead of adding subtype fields to the common section.
 */
export class ProductDetailDto {
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
  specificInfo!: ProductSpecificInfoDto;
}
