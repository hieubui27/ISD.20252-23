import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaginatedProducts,
  ProductDetailPersistenceModel,
  ProductQueryParams,
  ProductQueryRepository,
  ProductSortOption,
} from '../../domain/repositories/product-query.repository.interface';

/** Maximum page size accepted from the client to protect the database. */
const MAX_PAGE_SIZE = 100;
/** Columns exposed on the customer catalog list. */
const PRODUCT_LIST_SELECT = {
  id: true,
  title: true,
  category: true,
  currentPrice: true,
  quantity: true,
  status: true,
  imageUrl: true,
} as const;

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

  /**
   * Returns one page of customer-facing catalog products.
   *
   * Filtering (category + search) and ordering are applied at the database level
   * so that paging, the total count and the visible items always agree with the
   * active filter. Two paging strategies are supported on the same query:
   *
   *  - Keyset / cursor pagination (preferred): when `cursor` is supplied with the
   *    default `recommended` sort, the next page is fetched relative to the last
   *    seen id. This is the "load the next 20 products" flow.
   *  - Offset pagination: when a `page` index is supplied (or a non-default sort
   *    is used), the page is fetched with `skip`/`take` so the UI can jump to any
   *    page number.
   *
   * When `limit` is omitted, every matching product is returned (used by internal
   * screens that are not paginated).
   */
  async findProducts(
    params: ProductQueryParams = {},
  ): Promise<PaginatedProducts> {
    const where = this.buildWhere(params);
    const orderBy = this.buildOrderBy(params.sort);

    // totalCount reflects the active filter, NOT the whole catalog. This is what
    // makes the "X items" count correct when a category is selected.
    const totalCount: number = await this.prisma.product.count({ where });

    // No limit => return everything (non-paginated consumers).
    if (!params.limit || params.limit <= 0) {
      const items = await this.prisma.product.findMany({
        where,
        orderBy,
        select: PRODUCT_LIST_SELECT,
      });
      return { items, totalCount, nextCursor: null };
    }

    const limit = Math.min(params.limit, MAX_PAGE_SIZE);

    const query: Record<string, unknown> = {
      where,
      orderBy,
      take: limit,
      select: PRODUCT_LIST_SELECT,
    };

    const canUseCursor =
      !!params.cursor && (params.sort ?? 'recommended') === 'recommended';

    if (canUseCursor) {
      // Keyset pagination: start just after the last item of the previous page.
      query['cursor'] = { id: BigInt(params.cursor as string) };
      query['skip'] = 1;
    } else if (params.page && params.page > 1) {
      // Offset pagination for direct page jumps.
      query['skip'] = (params.page - 1) * limit;
    }

    const items: ProductDetailPersistenceModel[] =
      await this.prisma.product.findMany(query);

    // There is a following page only if we filled the current one and have not
    // yet reached the total. nextCursor is the id of the last returned item.
    const consumedBefore = params.page && params.page > 1
      ? (params.page - 1) * limit
      : 0;
    const hasMore = consumedBefore + items.length < totalCount;
    const lastItem = items[items.length - 1] as
      | { id?: unknown }
      | undefined;
    const nextCursor =
      hasMore && lastItem?.id != null ? String(lastItem.id) : null;

    return { items, totalCount, nextCursor };
  }

  /** Builds the Prisma `where` filter shared by the count and the page query. */
  private buildWhere(params: ProductQueryParams): Record<string, unknown> {
    // Only active, in-stock products are exposed to the customer catalog.
    // Deactivated / unavailable / out-of-stock products are hidden.
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      quantity: { gt: 0 },
    };

    const categories = (params.categories ?? [])
      .map((category) => category.trim())
      .filter((category) => category.length > 0);
    if (categories.length > 0) {
      // Case-insensitive category match (DB stores free-text categories).
      where['category'] = {
        in: categories,
        mode: 'insensitive',
      };
    }

    const search = params.search?.trim();
    if (search) {
      where['title'] = { contains: search, mode: 'insensitive' };
    }

    return where;
  }

  /** Maps a catalog sort option to a Prisma `orderBy` clause. */
  private buildOrderBy(
    sort: ProductSortOption = 'recommended',
  ): Array<Record<string, 'asc' | 'desc'>> {
    switch (sort) {
      case 'priceAsc':
        return [{ currentPrice: 'asc' }, { id: 'desc' }];
      case 'priceDesc':
        return [{ currentPrice: 'desc' }, { id: 'desc' }];
      case 'titleAsc':
        return [{ title: 'asc' }, { id: 'desc' }];
      case 'recommended':
      default:
        // Newest first; id is a stable tie-breaker required for keyset paging.
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
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
