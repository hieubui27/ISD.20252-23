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
export class CheckoutDraftService {
  save(draft: CheckoutDraft): void {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }

  get(): CheckoutDraft | null {
    const rawDraft = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!rawDraft) return null;

    try {
      return JSON.parse(rawDraft) as CheckoutDraft;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }

  toPlaceOrderItems(draft: CheckoutDraft): PlaceOrderCartItem[] {
    return draft.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
}
