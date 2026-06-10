import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OrderSummary } from '../../services/payment.service';
import {
  InvoicePreview,
} from '../../place-order/models/place-order.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../../place-order/services/checkout-draft.service';
import { PlaceOrderApiService } from '../../place-order/services/place-order-api.service';
import { EMPTY_ORDER } from '../stores/payment-page-state.store';

@Injectable({ providedIn: 'root' })
export class PaymentOrderSummaryService {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);

  fromCheckoutDraft(draft: CheckoutDraft): OrderSummary {
    const subtotal = draft.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    return {
      items: draft.items.map((item) => ({
        id: item.productId.toString(),
        name: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      vatRate: EMPTY_ORDER.vatRate,
      shippingFee: EMPTY_ORDER.shippingFee,
      total: subtotal + subtotal * EMPTY_ORDER.vatRate,
    };
  }

  previewInvoice(
    draft: CheckoutDraft,
    currentOrder: OrderSummary,
  ): Observable<OrderSummary> {
    return this.placeOrderApi
      .previewInvoice({
        items: this.checkoutDraftService.toPlaceOrderItems(draft),
        deliveryInfo: draft.deliveryInfo,
      })
      .pipe(map((preview) => this.fromInvoicePreview(preview, currentOrder)));
  }

  private fromInvoicePreview(
    preview: InvoicePreview,
    currentOrder: OrderSummary,
  ): OrderSummary {
    const currentItemsById = new Map(
      currentOrder.items.map((item) => [item.id, item]),
    );
    const previewItems =
      preview.items.length > 0
        ? preview.items.map((item) => {
            const id = item.productId.toString();
            const currentItem = currentItemsById.get(id);

            return {
              id,
              name:
                item.title || currentItem?.name || `Product ${item.productId}`,
              quantity: item.quantity,
              unitPrice: item.price,
            };
          })
        : currentOrder.items;

    return {
      items: previewItems,
      subtotal: preview.subtotalBeforeVat,
      vatRate:
        preview.subtotalBeforeVat > 0
          ? preview.vatAmount / preview.subtotalBeforeVat
          : EMPTY_ORDER.vatRate,
      shippingFee: preview.deliveryFee,
      total: preview.totalAmount,
    };
  }
}
