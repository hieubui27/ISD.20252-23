import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaypalService } from '../../src/paypal/paypal.service';
import { PaypalGatewayAdapter } from '../../src/payment/adapters/paypal-gateway.adapter';
import { PaymentMethod } from '../../src/payment/constants/payment.constants';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaypalService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      PAYPAL_CLIENT_ID: 'client-id',
      PAYPAL_SECRET: 'secret',
      PAYPAL_BASE_URL: 'https://paypal.test',
      PAYPAL_RETURN_URL: 'http://localhost:4200/payment',
      PAYPAL_CANCEL_URL: 'http://localhost:4200/payment',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createService = () => new PaypalService();

  it('gets a PayPal access token', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'token-123' },
    });

    const token = await createService().getAccessToken();

    expect(token).toBe('token-123');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://paypal.test/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        auth: { username: 'client-id', password: 'secret' },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  });

  it('creates a PayPal order', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123' } })
      .mockResolvedValueOnce({
        data: { id: 'PAYPAL-ORDER-1', status: 'CREATED' },
      });

    const result = await createService().createOrder(20);

    expect(result).toEqual({ id: 'PAYPAL-ORDER-1', status: 'CREATED' });
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'https://paypal.test/v2/checkout/orders',
      expect.objectContaining({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: '20.00' } }],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('rejects invalid order amounts', async () => {
    await expect(createService().createOrder(0)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('captures a PayPal order', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123' } })
      .mockResolvedValueOnce({
        data: { id: 'PAYPAL-ORDER-1', status: 'COMPLETED' },
      });

    const result = await createService().capturePayment('PAYPAL-ORDER-1');

    expect(result.status).toBe('COMPLETED');
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'https://paypal.test/v2/checkout/orders/PAYPAL-ORDER-1/capture',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          'PayPal-Request-Id': 'PAYPAL-ORDER-1',
        }),
      }),
    );
  });
});

describe('PaypalGatewayAdapter', () => {
  const paypalService = {
    createOrder: jest.fn(),
    capturePayment: jest.fn(),
  };

  let adapter: PaypalGatewayAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PaypalGatewayAdapter(paypalService as any);
  });

  it('uses PayPal as its payment method', () => {
    expect(adapter.getMethod()).toBe(PaymentMethod.PAYPAL);
  });

  it('creates a payment from a PayPal approval link', async () => {
    paypalService.createOrder.mockResolvedValue({
      id: 'PAYPAL-ORDER-1',
      links: [{ rel: 'approve', href: 'https://paypal.test/approve' }],
    });

    const result = await adapter.createPayment({
      gatewayOrderId: 'TRANSACTION-1',
      amount: 520000,
      description: 'AIMS order',
    });

    expect(paypalService.createOrder).toHaveBeenCalledWith(20);
    expect(result.paymentUrl).toBe('https://paypal.test/approve');
    expect(result.transactionUpdate).toEqual({
      gatewayOrderId: 'PAYPAL-ORDER-1',
    });
  });

  it('captures a payment and keeps the PayPal capture id', async () => {
    paypalService.capturePayment.mockResolvedValue({
      id: 'PAYPAL-ORDER-1',
      purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
    });

    const result = await adapter.confirmPayment('PAYPAL-ORDER-1');

    expect(paypalService.capturePayment).toHaveBeenCalledWith('PAYPAL-ORDER-1');
    expect(result.providerData).toEqual(
      expect.objectContaining({ captureId: 'CAPTURE-1' }),
    );
  });
});
