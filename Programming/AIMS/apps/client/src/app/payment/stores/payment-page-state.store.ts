import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  OrderSummary,
  PaymentMethod,
} from '../../services/payment.service';

export interface PaymentPageState {
  isLoading: boolean;
  errorMessage: string;
  statusMessage: string;
  order: OrderSummary;
  cartItemCount: number;
  qrImageUrl: string;
  isVietQrSuccess: boolean;
  selectedMethod: PaymentMethod;
  paypalRedirectUrl: string;
  paypalApproved: boolean;
  paypalConfirmed: boolean;
}

export const EMPTY_ORDER: OrderSummary = {
  items: [],
  subtotal: 0,
  vatRate: 0.1,
  shippingFee: 0,
  total: 0,
};

const INITIAL_STATE: PaymentPageState = {
  isLoading: false,
  errorMessage: '',
  statusMessage: '',
  order: EMPTY_ORDER,
  cartItemCount: 0,
  qrImageUrl: '',
  isVietQrSuccess: false,
  selectedMethod: 'VIETQR',
  paypalRedirectUrl: '',
  paypalApproved: false,
  paypalConfirmed: false,
};

@Injectable()
export class PaymentPageStateStore {
  private readonly stateSubject = new BehaviorSubject<PaymentPageState>({
    ...INITIAL_STATE,
    order: { ...EMPTY_ORDER, items: [] },
  });

  readonly state$ = this.stateSubject.asObservable();

  get snapshot(): PaymentPageState {
    return this.stateSubject.value;
  }

  patch(patch: Partial<PaymentPageState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch,
    });
  }

  setOrder(order: OrderSummary): void {
    this.patch({
      order,
      cartItemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }
}
