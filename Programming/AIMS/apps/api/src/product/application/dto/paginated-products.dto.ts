import { ProductListItemDto } from './product-list-item.dto';

/**
 * Module: PaginatedProductsDto
 * Use Case: UC235 - View Product Detail (catalog browsing)
 *
 * SOLID Review:
 * SRP: Satisfied. This DTO only carries one page of catalog data plus paging metadata.
 * OCP: Satisfied. New paging metadata can be added without breaking item consumers.
 * LSP: Not applicable. This DTO does not define an inheritance hierarchy.
 * ISP: Satisfied. List screens depend only on items + paging metadata.
 * DIP: Not applicable. DTOs have no infrastructure dependency.
 *
 * Improvement Direction:
 * Keep this envelope generic enough to be reused by other paginated read endpoints.
 */
export class PaginatedProductsDto {
  /** Products for the requested page (at most `limit` items). */
  items!: ProductListItemDto[];

  /**
   * Total number of products matching the active filter (category/search),
   * across ALL pages. The catalog uses this for the "X items" count and to
   * compute the total number of pages.
   */
  totalCount!: number;

  /** Id to send back as `cursor` to load the next page, or null on the last page. */
  nextCursor!: string | null;

  /** 1-based index of the returned page. */
  page!: number;

  /** Page size used for this response. */
  limit!: number;

  /** Total number of pages for the active filter (ceil(totalCount / limit)). */
  totalPages!: number;
}
