import { ProductEntity } from './product.entity';

/**
 * + Coupling/Cohesion level: Data Coupling (Inheritance) / Informational Cohesion
 * + Reason why: Data Coupling through inheritance from ProductEntity, expanding its state. Informational Cohesion because it merely groups Book-specific data attributes together without complex logic.
 */
export class BookEntity extends ProductEntity {
  author: string | null;
  coverType: string;
  nbPages: number;
  genre: string;

  constructor(partial: Partial<BookEntity>) {
    super(partial);
    Object.assign(this, partial);
  }

  validate(): boolean {
    if (!this.author || this.author.trim() === '') {
      return false;
    }
    return true;
  }
}
