import { ProductEntity } from './product.entity';

/**
 * + Coupling/Cohesion level: Data Coupling (Inheritance) / Informational Cohesion
 * + Reason why: Data Coupling through inheritance from ProductEntity, expanding its state. Informational Cohesion because it merely groups DVD-specific data attributes together without complex logic.
 */
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
