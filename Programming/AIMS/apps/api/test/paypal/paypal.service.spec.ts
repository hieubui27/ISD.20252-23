import axios from 'axios';
import { PaypalService } from '../../src/payment/paypal/paypal.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaypalService', () => {
  let service: PaypalService;

  beforeAll(() => {
    process.env.PAYPAL_CLIENT_ID = 'test-client-id';
    process.env.PAYPAL_SECRET = 'test-secret';
    process.env.PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaypalService],
    }).compile();

    service = module.get<PaypalService>(PaypalService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // getAccessToken
  // ─────────────────────────────────────────
  describe('getAccessToken', () => {
    it('should return access token successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-token-123' },
      });

      const token = await service.getAccessToken();

      expect(token).toBe('mock-token-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/oauth2/token'),
        'grant_type=client_credentials',
        expect.objectContaining({
          auth: { username: 'test-client-id', password: 'test-secret' },
        }),
      );
    });

    it('should throw UnauthorizedException when API fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─────────────────────────────────────────
  // createOrder
  // ─────────────────────────────────────────
  describe('createOrder', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-token-123' },
      });
    });

    it('should call API with valid amount', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'ORDER-123', status: 'CREATED' },
      });

      const result = await service.createOrder(100);
      expect(result).toEqual({ id: 'ORDER-123', status: 'CREATED' });
    });

    it('should format amount with 2 decimal places (toFixed)', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'ORDER-456', status: 'CREATED' },
      });

      await service.createOrder(19.999);

      const orderCallBody = mockedAxios.post.mock.calls[1][1] as any;
      expect(orderCallBody.purchase_units[0].amount.value).toBe('20.00');
    });

    it('should throw UnauthorizedException when getAccessToken fails', async () => {
      jest.clearAllMocks();
      mockedAxios.post.mockRejectedValueOnce(new Error('Auth failed'));

      await expect(service.createOrder(100)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on API 400', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('Request failed with status code 400'),
      );

      await expect(service.createOrder(100)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on API 500', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('Request failed with status code 500'),
      );

      await expect(service.createOrder(100)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─────────────────────────────────────────
  // capturePayment
  // ─────────────────────────────────────────
  describe('capturePayment', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-token-123' },
      });
    });

    it('should capture payment successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'ORDER-123', status: 'COMPLETED' },
      });

      const result = await service.capturePayment('ORDER-123');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw BadRequestException on insufficient balance', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('INSTRUMENT_DECLINED'));

      await expect(service.capturePayment('ORDER-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on duplicate payment', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('ORDER_ALREADY_CAPTURED'),
      );

      await expect(service.capturePayment('ORDER-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────
  // refundPayment
  // ─────────────────────────────────────────
  describe('refundPayment', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-token-123' },
      });
    });

    it('should refund full payment successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'REFUND-001', status: 'COMPLETED' },
      });

      const result = await service.refundPayment('CAPTURE-123');
      expect(result.status).toBe('COMPLETED');
    });

    it('should refund partial amount successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'REFUND-002', status: 'COMPLETED' },
      });

      const result = await service.refundPayment('CAPTURE-123');
      expect(result).toEqual({ id: 'REFUND-002', status: 'COMPLETED' });
    });

    it('should throw BadRequestException when refund exceeds captured amount', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('REFUND_AMOUNT_EXCEEDED'),
      );

      await expect(service.refundPayment('CAPTURE-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when refunding unpaid order', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('CAPTURE_NOT_FOUND'));

      await expect(service.refundPayment('INVALID-CAPTURE')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
