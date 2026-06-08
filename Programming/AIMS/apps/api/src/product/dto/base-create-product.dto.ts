import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  BOOK = 'BOOK',
  CD = 'CD',
  DVD = 'DVD',
  NEWSPAPER = 'NEWSPAPER',
}

/**
 * [SOLID Violation in Old Design]
 * Violated Principle: SRP & OCP
 * Code Section: CreateProductDto (Old version)
 * Why: The old CreateProductDto was a "God DTO" containing specific fields for ALL product types (Book, CD, DVD, Newspaper). Adding a new product like Clothing or E-Book Reader would force modifications to this file, violating OCP. It also violated SRP by having multiple reasons to change.
 * Proposed solution direction / Refactored: Extracted common product fields into this BaseCreateProductDto. Specific product fields are now in their own subclass DTOs (e.g., CreateBookDto), which extend this base class.
 */
export class BaseCreateProductDto {
  @IsString() @IsNotEmpty() barcode: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() dimensions?: string;
  @IsNumber() @Min(0) weight: number;
  @IsNumber() @Min(0) originalValue: number;
  @IsNumber() @Min(0) currentPrice: number;
  @IsNumber() @Min(0) quantity: number;
  @IsString() @IsNotEmpty() status: string;
  @IsString() @IsNotEmpty() imageUrl: string;
  @IsString() @IsNotEmpty() videoUrl: string;

  @IsEnum(ProductType) @IsNotEmpty() type: ProductType;
}
