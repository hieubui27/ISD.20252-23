import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_QUERY_REPOSITORY,
  ProductQueryParams,
  ProductQueryRepository,
} from '../../domain/repositories/product-query.repository.interface';
import { PaginatedProductsDto } from '../dto/paginated-products.dto';
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

  async execute(
    params: ProductQueryParams = {},
  ): Promise<PaginatedProductsDto> {
    const { items, totalCount, nextCursor } =
      await this.productRepository.findProducts(params);

    const limit = params.limit && params.limit > 0 ? params.limit : totalCount;
    const page = params.page && params.page > 0 ? params.page : 1;
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1;

    return {
      items: items.map((product) =>
        ProductDetailMapper.toListItemDto(product),
      ),
      totalCount,
      nextCursor,
      page,
      limit,
      totalPages,
    };
  }
}
