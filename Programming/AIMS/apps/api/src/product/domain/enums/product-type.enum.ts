/**
 * Module: ProductType
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This enum defines the supported product categories for read models.
 * OCP: Partially satisfied. Adding a product type should add a new mapper/component without changing common DTO fields.
 * LSP: Not applicable. This enum does not define substitutable behavior.
 * ISP: Satisfied. Consumers depend on a focused product type contract.
 * DIP: Not applicable. This enum has no infrastructure dependency.
 *
 * Improvement Direction:
 * Keep type values stable across backend DTOs and Angular models.
 */
export enum ProductType {
  BOOK = 'BOOK',
  NEWSPAPER = 'NEWSPAPER',
  CD = 'CD',
  DVD = 'DVD',
}

export type ProductTypeValue = `${ProductType}`;
