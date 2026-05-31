import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_QUERY_REPOSITORY,
  ProductQueryRepository,
} from '../../domain/repositories/product-query.repository.interface';
import { ProductListItemDto } from '../dto/product-list-item.dto';
import { ProductDetailMapper } from '../mappers/product-detail.mapper';

/**
 * Module: GetProductsListUseCase
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This use case only coordinates product list retrieval.
 * OCP: Satisfied. List mapping changes are delegated to ProductDetailMapper.
 * LSP: Satisfied. Any ProductQueryRepository implementation can be substituted.
 * ISP: Satisfied. This use case depends only on product query operations.
 * DIP: Satisfied. It depends on ProductQueryRepository abstraction rather than Prisma.
 *
 * Improvement Direction:
 * Keep home/list orchestration here and avoid adding product command behavior.
 */
@Injectable()
export class GetProductsListUseCase {
  constructor(
    @Inject(PRODUCT_QUERY_REPOSITORY)
    private readonly productRepository: ProductQueryRepository,
  ) {}

  async execute(): Promise<ProductListItemDto[]> {
    const products = await this.productRepository.findProducts();
    return products.map((product) =>
      ProductDetailMapper.toListItemDto(product),
    );
  }
}
