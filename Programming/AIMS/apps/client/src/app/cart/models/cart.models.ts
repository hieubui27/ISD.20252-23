/**
 * Module: cart.models.ts
 * Use Case: UC-Cart - Add To Cart / View Cart
 *
 * Shared cart contracts for the client. The cart is intentionally browser-only:
 * CartStoreService keeps the state in Angular signals and mirrors it to
 * localStorage so it survives reloads without requiring backend APIs.
 */

/** A line the user has added to their cart, stored locally. */
export interface CartItem {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  type?: string;
}

/** Browser-rendered cart line derived from CartItem. */
export interface CartPreviewItem {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string;
  type?: string;
}

/** Browser-rendered cart summary. */
export interface CartPreview {
  items: CartPreviewItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
}
