import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  PaymentService,
  PaymentResultDto,
} from '../../services/payment.service';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import {
  PaypalPaymentSession,
  PendingPaymentSession,
} from '../models/payment-session.models';
import { PAYMENT_METHOD } from '../constants/payment.constants';
import { PaymentSessionStorageService } from '../services/payment-session-storage.service';
import { mapPaymentResult } from '../services/payment-result.utils';

@Injectable({ providedIn: 'root' })
export class PaypalPaymentFlowService {
  private readonly paymentService = inject(PaymentService);
  private readonly paymentSessionStorage = inject(PaymentSessionStorageService);

  createOrReusePayment(
    pendingPaymentSession: PendingPaymentSession,
  ): Observable<PlaceOrderPaymentResult> {
    return this.paymentService
      .requestPayment({
        orderId: pendingPaymentSession.orderId,
        invoiceId: pendingPaymentSession.invoiceId,
        paymentMethod: PAYMENT_METHOD.PAYPAL,
        amount: pendingPaymentSession.totalAmount,
        customerEmail: pendingPaymentSession.customerEmail,
      })
      .pipe(
        map((paymentResult) =>
          mapPaymentResult(pendingPaymentSession, paymentResult),
        ),
      );
  }

  capture(paymentSession: PaypalPaymentSession): Observable<PaymentResultDto> {
    return this.paymentService.confirmTransaction({
      orderId: paymentSession.orderId,
      invoiceId: paymentSession.invoiceId,
      paymentMethod: PAYMENT_METHOD.PAYPAL,
      transactionId: '',
      transactionContent: 'PayPal capture',
      transactionDateTime: new Date().toISOString(),
    });
  }

  saveSession(orderId: string, invoiceId: string): void {
    this.paymentSessionStorage.savePaypalSession(orderId, invoiceId);
  }

  loadSession(): PaypalPaymentSession | null {
    return this.paymentSessionStorage.loadPaypalSession();
  }

  clearSession(): void {
    this.paymentSessionStorage.clearPaypalSession();
  }
}
