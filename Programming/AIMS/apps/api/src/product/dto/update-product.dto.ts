// apps/api/src/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/**
 * + Coupling/Cohesion level: Data Coupling (Inheritance) / Informational Cohesion
 * + Reason why: Data Coupling because it inherits from CreateProductDto using NestJS PartialType. Informational Cohesion because it merely groups properties meant for updating a Product without active behavioral logic.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
