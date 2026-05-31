/**
 * Module: ProductListItemDto
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This DTO carries only product card data for list/home screens.
 * OCP: Satisfied. New product types can reuse the same list contract.
 * LSP: Not applicable. This DTO does not define an inheritance hierarchy.
 * ISP: Satisfied. List consumers receive only the fields needed for product cards.
 * DIP: Not applicable. DTOs have no infrastructure dependency.
 *
 * Improvement Direction:
 * Keep this DTO small so home page rendering does not depend on full product detail data.
 */
export class ProductListItemDto {
  id!: string;
  title!: string;
  type!: string;
  currentPrice!: number;
  imageUrl?: string;
  status!: string;
}
