// apps/api/src/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { GetProductsListUseCase } from './application/use-cases/get-products-list.use-case';
import { GetProductLogsUseCase } from './application/use-cases/get-product-logs.use-case';
import { GetAllProductLogsUseCase } from './application/use-cases/get-all-product-logs.use-case';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { PRODUCT_QUERY_REPOSITORY } from './domain/repositories/product-query.repository.interface';
import { IProductLogServiceToken } from './interfaces/product-log.service.interface';
import { ProductLogService } from './services/product-log.service';
import { PRODUCT_HANDLERS } from './product.constants';
import { BookHandler } from './product-handler/book.handler';
import { CdHandler } from './product-handler/cd.handler';
import { DvdHandler } from './product-handler/dvd.handler';
import { NewspaperHandler } from './product-handler/newspaper.handler';
import { DailyQuotaService } from './services/daily-quota.service';
import { ProductRepository } from './product.repository';

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
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    GetProductDetailUseCase,
    GetProductsListUseCase,
    GetProductLogsUseCase,
    GetAllProductLogsUseCase,
    ProductRepository,
    PrismaProductRepository,
    {
      provide: PRODUCT_QUERY_REPOSITORY,
      useExisting: PrismaProductRepository,
    },
    {
      provide: IProductLogServiceToken,
      useClass: ProductLogService,
    },
    DailyQuotaService,
    BookHandler,
    CdHandler,
    DvdHandler,
    NewspaperHandler,
    {
      provide: PRODUCT_HANDLERS,
      useFactory: (...handlers: any[]) => handlers,
      inject: [BookHandler, CdHandler, DvdHandler, NewspaperHandler],
    },
  ],
})
export class ProductModule {}
