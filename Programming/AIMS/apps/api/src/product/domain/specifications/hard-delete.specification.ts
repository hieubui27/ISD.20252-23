import { ISpecification } from './specification.interface';

/**
 * Specification to check if a product can be hard-deleted from the database.
 * Rule: A product can only be hard-deleted if its quantity is 0.
 */
export class HardDeleteSpecification implements ISpecification<any> {
  isSatisfiedBy(product: any): boolean {
    return product.quantity === 0;
  }
}
