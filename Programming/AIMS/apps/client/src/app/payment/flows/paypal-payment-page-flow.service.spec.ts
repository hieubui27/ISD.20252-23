jest.mock('../../core/api/api.config', () => ({
  AIMS_API_BASE_URL: 'http://api.test',
}));

import { Router } from '@angular/router';
import { of } from 'rxjs';
import {
  resetAngularMockProviders,
  setAngularMockProvider,
} from '../../../../test/angular-core.mock';
import { PlaceOrderPaymentResult } from '../../place-order/models/place-order.models';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/payment.constants';
import { PendingPaymentSession } from '../models/payment-session.models';
import { PaymentCompletionService } from '../services/payment-completion.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { PaymentStatusApiService } from '../services/payment-status-api.service';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';
import { PaypalPaymentFlowService } from './paypal-payment-flow.service';
import { PaypalPaymentPageFlowService } from './paypal-payment-page-flow.service';

describe('PaypalPaymentPageFlowService', () => {
  const pendingSession: PendingPaymentSession = {
    orderId: 'ORDER-1',
    invoiceId: 'INV-1',
    totalAmount: 520000,
    customerEmail: 'customer@example.com',
    checkoutKey: 'checkout-key',
  };

  const paymentResult: PlaceOrderPaymentResult = {
    orderId: 'ORDER-1',
    invoiceId: 'INV-1',
    totalAmount: 520000,
    paymentMethod: PAYMENT_METHOD.PAYPAL,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentUrl: 'https://paypal.test/approve',
    qrCode: '',
    paymentTransactionId: 'PAYPAL-ORDER-1',
    message: 'Payment created',
  };

  let paymentCompletion: { complete: jest.Mock };
  let paypalPaymentFlow: {
    createOrReusePayment: jest.Mock;
    loadSession: jest.Mock;
    capture: jest.Mock;
    saveSession: jest.Mock;
    clearSession: jest.Mock;
  };
  let paymentStatusApi: { getLatestByOrderId: jest.Mock };
  let pendingPaymentSession: {
    session: PendingPaymentSession | null;
    ensure: jest.Mock;
    saveFromPayment: jest.Mock;
  };
  let router: { navigate: jest.Mock };
  let stateStore: PaymentPageStateStore;
  let service: PaypalPaymentPageFlowService;

  beforeEach(() => {
    paymentCompletion = { complete: jest.fn() };
    paypalPaymentFlow = {
      createOrReusePayment: jest.fn(),
      loadSession: jest.fn(),
      capture: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
    };
    paymentStatusApi = { getLatestByOrderId: jest.fn() };
    pendingPaymentSession = {
      session: null,
      ensure: jest.fn(),
      saveFromPayment: jest.fn(),
    };
    router = { navigate: jest.fn() };
    stateStore = new PaymentPageStateStore();

    resetAngularMockProviders();
    setAngularMockProvider(PaymentCompletionService, paymentCompletion as any);
    setAngularMockProvider(PaypalPaymentFlowService, paypalPaymentFlow as any);
    setAngularMockProvider(PaymentStatusApiService, paymentStatusApi as any);
    setAngularMockProvider(
      PendingPaymentSessionService,
      pendingPaymentSession as any,
    );
    setAngularMockProvider(Router, router as any);
    setAngularMockProvider(PaymentPageStateStore, stateStore);

    service = new PaypalPaymentPageFlowService();
  });

  afterEach(() => {
    resetAngularMockProviders();
  });

  it('starts a PayPal payment and stores the approval URL', async () => {
    stateStore.patch({ selectedMethod: PAYMENT_METHOD.PAYPAL });
    pendingPaymentSession.ensure.mockResolvedValue(pendingSession);
    paypalPaymentFlow.createOrReusePayment.mockReturnValue(of(paymentResult));

    service.start(true);
    await Promise.resolve();

    expect(paypalPaymentFlow.createOrReusePayment).toHaveBeenCalledWith(
      pendingSession,
    );
    expect(pendingPaymentSession.saveFromPayment).toHaveBeenCalledWith(
      paymentResult,
    );
    expect(paypalPaymentFlow.saveSession).toHaveBeenCalledWith(
      'ORDER-1',
      'INV-1',
    );
    expect(stateStore.snapshot.paypalRedirectUrl).toBe(
      'https://paypal.test/approve',
    );
    expect(stateStore.snapshot.isLoading).toBe(false);
  });

  it('shows an error when PayPal return has no saved session', () => {
    paypalPaymentFlow.loadSession.mockReturnValue(null);

    service.handleReturn();

    expect(stateStore.snapshot.selectedMethod).toBe(PAYMENT_METHOD.PAYPAL);
    expect(stateStore.snapshot.paypalApproved).toBe(false);
    expect(stateStore.snapshot.errorMessage).toContain(
      'payment session has expired',
    );
  });

  it('captures the saved PayPal session after returning from PayPal', () => {
    paypalPaymentFlow.loadSession.mockReturnValue({
      orderId: 'ORDER-1',
      invoiceId: 'INV-1',
    });
    paymentStatusApi.getLatestByOrderId.mockReturnValue(
      of({ status: PAYMENT_STATUS.PENDING }),
    );
    paypalPaymentFlow.capture.mockReturnValue(
      of({
        success: true,
        status: PAYMENT_STATUS.SUCCESS,
        paymentMethod: PAYMENT_METHOD.PAYPAL,
        paymentUrl: '',
        qrCode: '',
        transactionId: 'CAPTURE-1',
        message: 'Payment confirmed',
      }),
    );

    service.handleReturn();

    expect(paymentStatusApi.getLatestByOrderId).toHaveBeenCalledWith(
      'ORDER-1',
      PAYMENT_METHOD.PAYPAL,
    );
    expect(paypalPaymentFlow.capture).toHaveBeenCalledWith({
      orderId: 'ORDER-1',
      invoiceId: 'INV-1',
    });
    expect(paymentCompletion.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: PAYMENT_METHOD.PAYPAL,
        status: PAYMENT_STATUS.SUCCESS,
        transactionId: 'CAPTURE-1',
        orderId: 'ORDER-1',
        invoiceId: 'INV-1',
      }),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('navigates to order result after PayPal is confirmed', () => {
    stateStore.patch({ paypalConfirmed: true });

    service.confirm();

    expect(router.navigate).toHaveBeenCalledWith(['/order-result']);
  });
});
