// apps/api/src/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { GetProductsListUseCase } from './application/use-cases/get-products-list.use-case';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { PRODUCT_QUERY_REPOSITORY } from './domain/repositories/product-query.repository.interface';

/**
 * Module: ProductModule
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This module wires product controllers, use cases, and repositories.
 * OCP: Satisfied. Repository implementation can be swapped by changing DI binding.
 * LSP: Satisfied. Any ProductQueryRepository implementation can replace PrismaProductRepository.
 * ISP: Satisfied. UC235 is bound to query repository operations only.
 * DIP: Satisfied. The module binds PRODUCT_QUERY_REPOSITORY to the Prisma implementation.
 *
 * Improvement Direction:
 * Keep module wiring declarative and avoid putting business or database logic here.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    GetProductDetailUseCase,
    GetProductsListUseCase,
    PrismaProductRepository,
    {
      provide: PRODUCT_QUERY_REPOSITORY,
      useExisting: PrismaProductRepository,
    },
  ],
})
export class ProductModule {}
