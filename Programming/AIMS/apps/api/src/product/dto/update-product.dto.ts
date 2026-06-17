// apps/api/src/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';

/**
 * + Coupling/Cohesion level: Data Coupling (Inheritance) / Informational Cohesion
 * + Reason why: Data Coupling because it inherits from CreateProductDto using NestJS PartialType. Informational Cohesion because it merely groups properties meant for updating a Product without active behavioral logic.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() language?: string;
  @IsDateString() @IsOptional() publishDate?: string;

  @IsString() @IsOptional() coverType?: string;
  @IsNumber() @IsOptional() nbPages?: number;
  @IsString() @IsOptional() genre?: string;
  @IsArray() @IsOptional() authors?: string[];

  @IsString() @IsOptional() artist?: string;
  @IsString() @IsOptional() recordLabel?: string;
  @IsString() @IsOptional() track?: string;
  @IsDateString() @IsOptional() releaseDate?: string;
  @IsNumber() @IsOptional() totalLength?: number;

  @IsString() @IsOptional() discType?: string;
  @IsString() @IsOptional() director?: string;
  @IsString() @IsOptional() studio?: string;
  @IsString() @IsOptional() subtitles?: string;

  @IsString() @IsOptional() editorInChief?: string;
  @IsString() @IsOptional() issueNumber?: string;
  @IsString() @IsOptional() publicationFreq?: string;
  @IsString() @IsOptional() issn?: string;
  @IsString() @IsOptional() sections?: string;
}
