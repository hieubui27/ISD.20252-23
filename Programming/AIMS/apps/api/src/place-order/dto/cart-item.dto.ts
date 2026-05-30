import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * [ISP VIOLATION] – Interface Segregation Principle
 * CartItemDto exposes two optional fields — price and weight — that are
 * never read by the place-order flow. PlaceOrderBeService.normalizeItems()
 * uses only productId and quantity; price and weight are always fetched
 * fresh from the database inside buildInvoicePreviewFromProducts().
 * Every client that sends or processes a CartItemDto is forced to be
 * aware of fields it does not use, widening the interface unnecessarily.
 *
 * Improvement direction:
 *   - Remove price and weight from CartItemDto. Keep only productId and
 *     quantity, which represent the cart's intent.
 *   - If a separate use case (e.g., an optimistic price preview on the
 *     front-end) needs client-side price/weight, define a dedicated DTO
 *     for that use case rather than overloading the shared CartItemDto.
 */
export class CartItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  // [ISP] price is never used by the server — value always comes from the DB.
  @IsNumber()
  @IsOptional()
  price?: number;

  // [ISP] weight is never used by the server — value always comes from the DB.
  @IsNumber()
  @IsOptional()
  weight?: number;
}
