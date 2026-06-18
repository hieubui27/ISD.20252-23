export interface ISpecification<T> {
  /**
   * Checks if the candidate object satisfies the specification.
   */
  isSatisfiedBy(candidate: T): boolean;
}
