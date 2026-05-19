import { ProductEntity } from './product.entity';

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
