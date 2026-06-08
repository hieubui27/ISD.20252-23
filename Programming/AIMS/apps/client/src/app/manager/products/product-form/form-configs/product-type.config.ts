import { FormGroup } from '@angular/forms';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface IProductTypeConfig {
  type: string;
  label: string;
  fields: FormFieldConfig[];

  /**
   * Translates API data to Form data
   */
  mapToForm(specificInfo: any): any;

  /**
   * Translates Form data to API payload
   */
  mapToApi(formData: any): any;
}
