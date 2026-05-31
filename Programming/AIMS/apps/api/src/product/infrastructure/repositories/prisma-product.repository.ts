import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ProductDetailPersistenceModel,
  ProductQueryRepository,
} from '../../domain/repositories/product-query.repository.interface';

/**
 * Module: PrismaProductRepository
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This class only handles product persistence queries using Prisma.
 * OCP: Satisfied if adding new product-specific relations requires minimal changes in mapping layer.
 * LSP: Not applicable unless implementing a repository interface contract.
 * ISP: Satisfied if it implements only query methods required by ProductQueryRepository.
 * DIP: Satisfied. Upper layers depend on repository abstraction, not this concrete Prisma implementation.
 *
 * Improvement Direction:
 * Keep Prisma-specific query logic here and never expose Prisma models directly to controllers.
 */
@Injectable()
export class PrismaProductRepository implements ProductQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProducts(): Promise<ProductDetailPersistenceModel[]> {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        currentPrice: true,
        quantity: true,
        status: true,
        imageUrl: true,
      },
    });
  }

  async findProductById(
    productId: string,
  ): Promise<ProductDetailPersistenceModel | null> {
    return this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: {
        printableProduct: {
          include: {
            book: {
              include: {
                bookAuthors: {
                  include: {
                    author: true,
                  },
                },
              },
            },
            newspaper: true,
          },
        },
        discProduct: {
          include: {
            cd: true,
            dvd: true,
          },
        },
      },
    });
  }
}
