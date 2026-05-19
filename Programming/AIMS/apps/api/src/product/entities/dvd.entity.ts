import { ProductEntity } from './product.entity';

export class DVDEntity extends ProductEntity {
  director: string | null;
  discType: string;
  studio: string;
  subtitles: string;

  constructor(partial: Partial<DVDEntity>) {
    super(partial);
    Object.assign(this, partial);
  }

  validate(): boolean {
    if (!this.director || this.director.trim() === '') {
      return false;
    }
    return true;
  }
}
