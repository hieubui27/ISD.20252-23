jest.mock('../../core/api/api.config', () => ({
  AIMS_API_BASE_URL: 'http://api.test',
}));

import { firstValueFrom, of } from 'rxjs';
import {
  resetAngularMockProviders,
  setAngularMockProvider,
} from '../../../../test/angular-core.mock';
import {
  PaymentResultDto,
  PaymentService,
} from '../../services/payment.service';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/payment.constants';
import {
  PaypalPaymentSession,
  PendingPaymentSession,
} from '../models/payment-session.models';
import { PaymentSessionStorageService } from '../services/payment-session-storage.service';
import { PaypalPaymentFlowService } from './paypal-payment-flow.service';

describe('PaypalPaymentFlowService', () => {
  const pendingSession: PendingPaymentSession = {
    orderId: 'ORDER-1',
    invoiceId: 'INV-1',
    totalAmount: 520000,
    customerEmail: 'customer@example.com',
    checkoutKey: 'checkout-key',
  };

  let paymentService: {
    requestPayment: jest.Mock;
    confirmTransaction: jest.Mock;
  };
  let paymentSessionStorage: {
    savePaypalSession: jest.Mock;
    loadPaypalSession: jest.Mock;
    clearPaypalSession: jest.Mock;
  };
  let service: PaypalPaymentFlowService;

  beforeEach(() => {
    paymentService = {
      requestPayment: jest.fn(),
      confirmTransaction: jest.fn(),
    };
    paymentSessionStorage = {
      savePaypalSession: jest.fn(),
      loadPaypalSession: jest.fn(),
      clearPaypalSession: jest.fn(),
    };

    resetAngularMockProviders();
    setAngularMockProvider(PaymentService, paymentService as any);
    setAngularMockProvider(
      PaymentSessionStorageService,
      paymentSessionStorage as any,
    );

    service = new PaypalPaymentFlowService();
  });

  afterEach(() => {
    resetAngularMockProviders();
  });

  it('requests a PayPal payment', async () => {
    const paymentResult: PaymentResultDto = {
      success: true,
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: PAYMENT_METHOD.PAYPAL,
      paymentUrl: 'https://paypal.test/approve',
      qrCode: '',
      transactionId: 'PAYPAL-ORDER-1',
      message: 'Payment created',
    };
    paymentService.requestPayment.mockReturnValue(of(paymentResult));

    const result = await firstValueFrom(
      service.createOrReusePayment(pendingSession),
    );

    expect(paymentService.requestPayment).toHaveBeenCalledWith({
      orderId: 'ORDER-1',
      invoiceId: 'INV-1',
      paymentMethod: PAYMENT_METHOD.PAYPAL,
      amount: 520000,
      customerEmail: 'customer@example.com',
    });
    expect(result.paymentUrl).toBe('https://paypal.test/approve');
    expect(result.paymentTransactionId).toBe('PAYPAL-ORDER-1');
  });

  it('captures a PayPal payment', async () => {
    const paypalSession: PaypalPaymentSession = {
      orderId: 'ORDER-1',
      invoiceId: 'INV-1',
    };
    const captureResult: PaymentResultDto = {
      success: true,
      status: PAYMENT_STATUS.SUCCESS,
      paymentMethod: PAYMENT_METHOD.PAYPAL,
      paymentUrl: '',
      qrCode: '',
      transactionId: 'CAPTURE-1',
      message: 'Payment confirmed',
    };
    paymentService.confirmTransaction.mockReturnValue(of(captureResult));

    const result = await firstValueFrom(service.capture(paypalSession));

    expect(paymentService.confirmTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORDER-1',
        invoiceId: 'INV-1',
        paymentMethod: PAYMENT_METHOD.PAYPAL,
        transactionContent: 'PayPal capture',
      }),
    );
    expect(result).toBe(captureResult);
  });

  it('stores and clears the PayPal session', () => {
    const storedSession: PaypalPaymentSession = {
      orderId: 'ORDER-1',
      invoiceId: 'INV-1',
    };
    paymentSessionStorage.loadPaypalSession.mockReturnValue(storedSession);

    service.saveSession('ORDER-1', 'INV-1');
    const loadedSession = service.loadSession();
    service.clearSession();

    expect(paymentSessionStorage.savePaypalSession).toHaveBeenCalledWith(
      'ORDER-1',
      'INV-1',
    );
    expect(loadedSession).toBe(storedSession);
    expect(paymentSessionStorage.clearPaypalSession).toHaveBeenCalled();
  });
});
