import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';
import { BaseCreateProductDto } from './base-create-product.dto';

export class CreateBookDto extends BaseCreateProductDto {
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() language?: string;
  @IsDateString() @IsOptional() publishDate?: string;
  @IsString() @IsOptional() coverType?: string;
  @IsNumber() @IsOptional() nbPages?: number;
  @IsString() @IsOptional() genre?: string;
  @IsArray() @IsOptional() authors?: string[];
}

export class CreateCdDto extends BaseCreateProductDto {
  @IsString() @IsOptional() artist?: string;
  @IsString() @IsOptional() recordLabel?: string;
  @IsString() @IsOptional() track?: string;
  @IsDateString() @IsOptional() releaseDate?: string;
  @IsNumber() @IsOptional() totalLength?: number;
  @IsString() @IsOptional() genre?: string;
  @IsString() @IsOptional() language?: string;
}

export class CreateDvdDto extends BaseCreateProductDto {
  @IsString() @IsOptional() discType?: string;
  @IsString() @IsOptional() director?: string;
  @IsString() @IsOptional() studio?: string;
  @IsString() @IsOptional() subtitles?: string;
  @IsDateString() @IsOptional() releaseDate?: string;
  @IsNumber() @IsOptional() totalLength?: number;
  @IsString() @IsOptional() genre?: string;
  @IsString() @IsOptional() language?: string;
}

export class CreateNewspaperDto extends BaseCreateProductDto {
  @IsString() @IsOptional() editorInChief?: string;
  @IsString() @IsOptional() issueNumber?: string;
  @IsString() @IsOptional() publicationFreq?: string;
  @IsString() @IsOptional() issn?: string;
  @IsString() @IsOptional() sections?: string;
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() language?: string;
  @IsDateString() @IsOptional() publishDate?: string;
}

export {
  BaseCreateProductDto as CreateProductDto,
  ProductType,
} from './base-create-product.dto';
