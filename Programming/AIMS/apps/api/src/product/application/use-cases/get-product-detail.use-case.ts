import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PRODUCT_QUERY_REPOSITORY,
  ProductQueryRepository,
} from '../../domain/repositories/product-query.repository.interface';
import { ProductDetailDto } from '../dto/product-detail.dto';
import { ProductDetailMapper } from '../mappers/product-detail.mapper';

/**
 * Module: GetProductDetailUseCase
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This use case only coordinates the business flow for retrieving product detail.
 * OCP: Partially satisfied if product-type-specific mapping is delegated to dedicated mapper functions/classes.
 * LSP: Satisfied if all product subtypes preserve the common product contract.
 * ISP: Satisfied. This use case depends only on product query operations.
 * DIP: Satisfied. It depends on ProductQueryRepository abstraction rather than Prisma directly.
 *
 * Improvement Direction:
 * Keep business orchestration here and delegate persistence to repository and DTO transformation to mapper.
 */
@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_QUERY_REPOSITORY)
    private readonly productRepository: ProductQueryRepository,
  ) {}

  async execute(productId: string): Promise<ProductDetailDto> {
    if (!this.isValidProductId(productId)) {
      throw new BadRequestException('Invalid product identifier');
    }

    const product = await this.productRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    return ProductDetailMapper.toDetailDto(product);
  }

  private isValidProductId(productId: string): boolean {
    return /^[1-9]\d*$/.test(productId);
  }
}
