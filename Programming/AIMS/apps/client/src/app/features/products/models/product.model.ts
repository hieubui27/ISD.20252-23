/**
 * Module: product.model.ts
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This file defines product read models used by the Angular product feature.
 * OCP: Satisfied. Type-specific info is modeled as separate interfaces behind a union type.
 * LSP: Satisfied. Each product detail preserves the same common ProductDetail contract.
 * ISP: Satisfied. Components can depend on the specific interface they render.
 * DIP: Not applicable. Models do not depend on Angular services or HTTP details.
 *
 * Improvement Direction:
 * Keep shared UI contracts here and avoid adding fetch, routing, or formatting behavior.
 */
export type ProductType = 'BOOK' | 'NEWSPAPER' | 'CD' | 'DVD';

export interface ProductDimensions {
  height: number;
  width: number;
  length: number;
}

export interface ProductListItem {
  id: string;
  title: string;
  type: ProductType;
  currentPrice: number;
  imageUrl?: string;
  status: string;
}

export interface BookSpecificInfo {
  authors: string[];
  coverType: string;
  publisher: string;
  publicationDate: string;
  numberOfPages: number;
  language: string;
  genre: string;
}

export interface NewspaperSpecificInfo {
  editorInChief: string;
  publisher: string;
  publicationDate: string;
  issueNumber: string;
  releaseFrequency: string;
  issn: string;
  language: string;
  sections: string[];
}

export interface CDSpecificInfo {
  artists: string[];
  recordLabel: string;
  trackList: string[];
  genre: string;
  releaseDate: string;
}

export interface DVDSpecificInfo {
  discType: string;
  director: string;
  runtime: number;
  studio: string;
  language: string;
  subtitles: string[];
  releaseDate: string;
  genre: string;
}

export type ProductSpecificInfo =
  | BookSpecificInfo
  | NewspaperSpecificInfo
  | CDSpecificInfo
  | DVDSpecificInfo
  | Record<string, never>;

export interface ProductDetail {
  id: string;
  barcode: string;
  title: string;
  type: ProductType;
  currentPrice: number;
  originalValue: number;
  description: string;
  weight: number;
  dimensions: ProductDimensions;
  imageUrl?: string;
  stockQuantity: number;
  status: string;
  specificInfo: ProductSpecificInfo;
}

export function isUnavailableProductStatus(status: string): boolean {
  return ['DEACTIVATED', 'UNAVAILABLE', 'OUT_OF_STOCK'].includes(
    status.toUpperCase(),
  );
}
