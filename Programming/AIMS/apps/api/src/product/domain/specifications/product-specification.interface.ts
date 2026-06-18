import { ISpecification } from './specification.interface';

export interface IProductSpecification extends ISpecification<any> {
  /**
   * Returns the error message if the specification is not satisfied.
   */
  getMessage(): string;
}
