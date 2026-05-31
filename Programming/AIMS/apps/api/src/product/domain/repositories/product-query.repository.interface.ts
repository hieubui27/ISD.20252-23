export const PRODUCT_QUERY_REPOSITORY = Symbol('PRODUCT_QUERY_REPOSITORY');

export type ProductDetailPersistenceModel = Record<string, unknown>;

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
  findProducts(): Promise<ProductDetailPersistenceModel[]>;
  findProductById(
    productId: string,
  ): Promise<ProductDetailPersistenceModel | null>;
}
