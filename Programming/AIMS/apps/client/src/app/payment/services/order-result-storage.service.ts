import { Injectable } from '@angular/core';
import {
  ORDER_RESULT_STATE_KEY,
  OrderResultState,
} from '../../place-order/order-result/order-result-state';

@Injectable({ providedIn: 'root' })
export class OrderResultStorageService {
  save(state: OrderResultState): void {
    try {
      sessionStorage.setItem(ORDER_RESULT_STATE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }
}
