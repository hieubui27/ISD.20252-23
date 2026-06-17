import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartStoreService } from '../../cart/services/cart-store.service';
import { OrderResultState } from '../../place-order/order-result/order-result-state';
import { CheckoutDraftService } from '../../place-order/services/checkout-draft.service';
import { OrderResultStorageService } from './order-result-storage.service';
import { PendingPaymentSessionService } from './pending-payment-session.service';

@Injectable()
export class PaymentCompletionService {
  private readonly cartStore = inject(CartStoreService);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly orderResultStorage = inject(OrderResultStorageService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly router = inject(Router);

  complete(
    orderResult: OrderResultState | null,
    cleanup?: () => void,
    afterSave?: () => void,
  ): void {
    if (orderResult) {
      this.orderResultStorage.save(orderResult);
    }
    afterSave?.();
    this.cartStore.clear();
    this.checkoutDraftService.clear();
    cleanup?.();
    this.pendingPaymentSession.clear();
    this.router.navigate(['/order-result']);
  }
}
