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

export enum ProductType {
  BOOK = 'BOOK',
  CD = 'CD',
  DVD = 'DVD',
  NEWSPAPER = 'NEWSPAPER',
}

export class CreateProductDto {
  // Common Fields
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

  // Book Fields
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() language?: string;
  @IsDateString() @IsOptional() publishDate?: string;
  @IsString() @IsOptional() coverType?: string;
  @IsNumber() @IsOptional() nbPages?: number;
  @IsString() @IsOptional() genre?: string;
  @IsArray() @IsOptional() authorIds?: string[];

  // CD Fields
  @IsString() @IsOptional() artist?: string;
  @IsString() @IsOptional() recordLabel?: string;
  @IsString() @IsOptional() track?: string;

  // DVD Fields
  @IsString() @IsOptional() discType?: string;
  @IsString() @IsOptional() director?: string;
  @IsString() @IsOptional() studio?: string;
  @IsString() @IsOptional() subtitles?: string;

  // Newspaper Fields
  @IsString() @IsOptional() editorInChief?: string;
  @IsString() @IsOptional() issueNumber?: string;
  @IsString() @IsOptional() publicationFreq?: string;
  @IsString() @IsOptional() issn?: string;
  @IsString() @IsOptional() sections?: string;
}
