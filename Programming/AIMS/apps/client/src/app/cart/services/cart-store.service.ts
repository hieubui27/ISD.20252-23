import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart.models';

const CART_STORAGE_KEY = 'aims.cart';

/**
 * Module: CartStoreService
 * Use Case: UC-Cart - Add To Cart / View Cart
 *
 * Client-side cart store. Holds the cart as a signal and mirrors it to
 * localStorage so it survives reloads. All cart mutations (add / update /
 * remove) go through here, which keeps the header badge, detail page and cart
 * page in sync automatically via signals.
 *
 * SOLID notes:
 * - SRP: Owns cart state + browser persistence only.
 * - DIP: Could be refined by extracting a storage port; kept simple for now.
 */
@Injectable({ providedIn: 'root' })
export class CartStoreService {
  private readonly itemsSignal = signal<CartItem[]>(this.readFromStorage());

  /** Read-only view of cart lines. */
  readonly items = this.itemsSignal.asReadonly();

  /** Total quantity across all lines (used for the header badge). */
  readonly count = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0),
  );

  /** Number of distinct product lines. */
  readonly distinctCount = computed(() => this.itemsSignal().length);

  /** Subtotal of the locally stored cart (excludes VAT and delivery). */
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),
  );

  /** Add a product to the cart, merging quantity if it already exists. */
  add(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    const addQuantity = Math.max(1, Math.floor(quantity));

    this.itemsSignal.update((items) => {
      const existing = items.find(
        (line) => line.productId === item.productId,
      );

      if (existing) {
        return items.map((line) =>
          line.productId === item.productId
            ? { ...line, quantity: line.quantity + addQuantity }
            : line,
        );
      }

      return [...items, { ...item, quantity: addQuantity }];
    });

    this.persist();
  }

  /** Set an explicit quantity for a line; removes the line when quantity <= 0. */
  setQuantity(productId: number, quantity: number): void {
    const nextQuantity = Math.floor(quantity);

    if (nextQuantity <= 0) {
      this.remove(productId);
      return;
    }

    this.itemsSignal.update((items) =>
      items.map((line) =>
        line.productId === productId
          ? { ...line, quantity: nextQuantity }
          : line,
      ),
    );

    this.persist();
  }

  /** Increment a line quantity by a delta (can be negative). */
  changeQuantity(productId: number, delta: number): void {
    const line = this.itemsSignal().find(
      (item) => item.productId === productId,
    );

    if (!line) return;

    this.setQuantity(productId, line.quantity + delta);
  }

  /** Remove a line entirely. */
  remove(productId: number): void {
    this.itemsSignal.update((items) =>
      items.filter((line) => line.productId !== productId),
    );
    this.persist();
  }

  /** Empty the cart. */
  clear(): void {
    this.itemsSignal.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(this.itemsSignal()),
      );
    } catch {
      // Storage may be unavailable (private mode); cart stays in memory.
    }
  }

  private readFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(this.isValidCartItem);
    } catch {
      return [];
    }
  }

  private isValidCartItem(value: unknown): value is CartItem {
    if (!value || typeof value !== 'object') return false;

    const item = value as Record<string, unknown>;

    return (
      Number.isFinite(item['productId']) &&
      Number(item['productId']) > 0 &&
      typeof item['title'] === 'string' &&
      Number.isFinite(item['unitPrice']) &&
      Number.isFinite(item['quantity']) &&
      Number(item['quantity']) > 0
    );
  }
}
