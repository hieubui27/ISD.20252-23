import { ProductType } from '../dto/create-product.dto';

/**
 * [SOLID Violation in Old Design]
 * Violated Principle: ISP & OCP
 * Code Section: IProductHandler
 * Why: The old interface took a God DTO (CreateProductDto) as a parameter, forcing handlers to depend on data they don't need (ISP violation). It also lacked `update` and `validate` methods, making it hard to add new behaviors without changing the interface (OCP violation).
 * Proposed solution direction / Refactored: Introduced generics `T` and `U` for specific Create and Update DTOs. Added `validate` and `update` methods to support full product lifecycle per type.
 */
export interface IProductHandler<T = any, U = any> {
  supports(type: ProductType): boolean;
  validate(data: T): void;
  create(tx: any, productId: bigint, data: T): Promise<void>;
  update(tx: any, productId: bigint, data: U): Promise<void>;
}
