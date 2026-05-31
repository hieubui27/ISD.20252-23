import { Injectable } from '@angular/core';
import {
  PlaceOrderDeliveryInfo,
  PlaceOrderCartItem,
} from '../models/place-order.models';
import { ProductSelection } from '../../products/models/product.model';

export interface CheckoutDraft {
  items: ProductSelection[];
  deliveryInfo: PlaceOrderDeliveryInfo;
}

const CHECKOUT_DRAFT_KEY = 'aims.checkoutDraft';

@Injectable({ providedIn: 'root' })
/**
 * SOLID review:
 * - SRP: Low risk. The service is centered on checkout draft lifecycle, but it
 *   persists drafts, parses stored JSON, validates product selections, and maps
 *   draft items to place-order DTOs.
 * - DIP: Low risk. It depends directly on browser localStorage, which makes
 *   persistence harder to substitute in tests or server-side rendering.
 * - Improvement: Extract CheckoutDraftStorage and CheckoutDraftValidator. Keep this
 *   service as an orchestrator for draft lifecycle operations.
 */
export class CheckoutDraftService {
  save(draft: CheckoutDraft): void {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }

  get(): CheckoutDraft | null {
    const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!rawDraft) return null;

    try {
      return JSON.parse(rawDraft) as CheckoutDraft;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }

  hasValidItems(draft: CheckoutDraft | null): draft is CheckoutDraft {
    if (!draft || !Array.isArray(draft.items) || draft.items.length === 0) {
      return false;
    }

    return draft.items.every((item) => {
      const hasValidProduct =
        Number.isFinite(item.productId) &&
        item.productId > 0 &&
        typeof item.title === 'string' &&
        item.title.trim().length > 0;
      const hasValidQuantity =
        Number.isFinite(item.quantity) && item.quantity > 0;
      const hasValidPrice =
        Number.isFinite(item.unitPrice) && item.unitPrice >= 0;

      return hasValidProduct && hasValidQuantity && hasValidPrice;
    });
  }

  toPlaceOrderItems(draft: CheckoutDraft): PlaceOrderCartItem[] {
    return draft.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
}
