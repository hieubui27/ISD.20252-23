export const PRODUCT_QUERY_REPOSITORY = Symbol('PRODUCT_QUERY_REPOSITORY');

export type ProductDetailPersistenceModel = Record<string, unknown>;

/**
 * Supported catalog sort orders.
 * `recommended` keeps the default keyset order (newest first) and is the
 * only sort that supports cursor-based navigation.
 */
export type ProductSortOption =
  | 'recommended'
  | 'priceAsc'
  | 'priceDesc'
  | 'titleAsc';

/**
 * Read-side query parameters for the customer catalog.
 *
 * - `categories`: optional list of product categories to filter by (case-insensitive).
 * - `search`: optional free-text match against the product title.
 * - `sort`: catalog ordering. Cursor navigation only applies to `recommended`.
 * - `cursor`: id of the last item of the previous page (keyset pagination).
 * - `page`: 1-based page index used for direct page jumps (offset pagination).
 * - `limit`: page size. When omitted, all matching products are returned (no pagination).
 */
export interface ProductQueryParams {
  categories?: string[];
  search?: string;
  sort?: ProductSortOption;
  cursor?: string;
  page?: number;
  limit?: number;
}

/**
 * Result of a paginated catalog query.
 *
 * - `items`: products for the requested page.
 * - `totalCount`: total number of products matching the filter (NOT just this page).
 *   This is what fixes the "category count shows the global total" bug.
 * - `nextCursor`: id to pass as `cursor` to fetch the following page, or null when last page.
 */
export interface PaginatedProducts {
  items: ProductDetailPersistenceModel[];
  totalCount: number;
  nextCursor: string | null;
}

/**
 * Module: ProductQueryRepository
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This abstraction only exposes read operations needed by product viewing.
 * OCP: Satisfied. New persistence implementations can be added without changing use cases.
 * LSP: Satisfied. Any implementation can substitute Prisma if it preserves the query contract.
 * ISP: Satisfied. UC235 depends only on list/detail query methods, not command operations.
 * DIP: Satisfied. Application use cases depend on this abstraction instead of Prisma.
 *
 * Improvement Direction:
 * Keep create, update, delete, and stock adjustment operations in separate command abstractions.
 */
export interface ProductQueryRepository {
  findProducts(params?: ProductQueryParams): Promise<PaginatedProducts>;
  findProductById(
    productId: string,
  ): Promise<ProductDetailPersistenceModel | null>;
}
