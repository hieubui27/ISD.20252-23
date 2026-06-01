import { Injectable } from '@angular/core';
import { IProductTypeConfig } from './form-configs/product-type.config';
import { BookFormConfig } from './form-configs/book-form.config';
import { CdFormConfig } from './form-configs/cd-form.config';
import { DvdFormConfig } from './form-configs/dvd-form.config';
import { NewspaperFormConfig } from './form-configs/newspaper-form.config';

@Injectable({ providedIn: 'root' })
export class ProductFormFactory {
  private configs: Map<string, IProductTypeConfig> = new Map();

  constructor() {
    this.registerConfig(new BookFormConfig());
    this.registerConfig(new CdFormConfig());
    this.registerConfig(new DvdFormConfig());
    this.registerConfig(new NewspaperFormConfig());
  }

  public registerConfig(config: IProductTypeConfig): void {
    this.configs.set(config.type, config);
  }

  public getConfig(type: string): IProductTypeConfig {
    const config = this.configs.get(type);
    if (!config) {
      throw new Error(`No form config registered for product type: ${type}`);
    }
    return config;
  }

  public getAllTypes(): { type: string; label: string }[] {
    return Array.from(this.configs.values()).map((c) => ({
      type: c.type,
      label: c.label,
    }));
  }
}
