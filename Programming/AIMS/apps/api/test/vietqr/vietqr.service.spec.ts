import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentService } from '../../src/payment/payment.service';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../src/payment/constants/payment.constants';
import { VietqrService } from '../../src/vietqr/vietqr.service';

describe('VietqrService', () => {
  let service: VietqrService;

  const mockVietqrClient = {
    getAccessToken: jest.fn(),
    generateQRCode: jest.fn(),
    testCallback: jest.fn(),
  };

  beforeEach(() => {
    process.env.VIETQR_USERNAME = 'valid-username';
    process.env.VIETQR_PASSWORD = 'valid-password';
    process.env.VIETQR_BANK_CODE = 'MB';
    process.env.VIETQR_BANK_ACCOUNT = '123456789';
    process.env.VIETQR_USER_BANK_NAME = 'AIMS';
    process.env.VIETQR_QR_TYPE = '0';
    process.env.VIETQR_TRANS_TYPE = 'C';
    service = new VietqrService(mockVietqrClient);
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should get and cache access token successfully', async () => {
      mockVietqrClient.getAccessToken.mockResolvedValue({
        access_token: 'valid-access-token',
        expires_in: 300,
      });

      const result = await service.getAccessToken();
      const cachedResult = await service.getAccessToken();

      expect(mockVietqrClient.getAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toBe('valid-access-token');
      expect(cachedResult).toBe('valid-access-token');
      expect(service.getCachedAccessToken()).toBe('valid-access-token');
    });

    it('should throw authentication error when access token failed', async () => {
      mockVietqrClient.getAccessToken.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.getCachedAccessToken()).toBeUndefined();
    });
  });

  describe('generateQrCode', () => {
    it('should generate QR code successfully', async () => {
      mockVietqrClient.getAccessToken.mockResolvedValue({
        access_token: 'valid-access-token',
        expires_in: 300,
      });
      mockVietqrClient.generateQRCode.mockResolvedValue({
        qrCode: 'qr-code-data',
        content: 'THANH TOAN AIMS',
        amount: 250000,
        orderId: 'ORDDEMO001',
      });

      const result = await service.generateQrCode({
        orderId: 'ORDDEMO001',
        invoiceId: 'INV_DEMO_001',
        amount: 250000,
        description: 'THANH TOAN AIMS',
      });

      expect(mockVietqrClient.generateQRCode).toHaveBeenCalledWith(
        'valid-access-token',
        expect.objectContaining({
          bankCode: 'MB',
          bankAccount: '123456789',
          userBankName: 'AIMS',
          orderId: 'ORDDEMO001',
          amount: 250000,
          transType: 'C',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          qrCode: 'qr-code-data',
          amount: 250000,
          qrContent: 'THANH TOAN AIMS',
        }),
      );
    });

    it('should reject invalid amount', async () => {
      await expect(
        service.generateQrCode({
          orderId: 'ORDDEMO001',
          invoiceId: 'INV_DEMO_001',
          amount: 0,
          description: 'THANH TOAN AIMS',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockVietqrClient.generateQRCode).not.toHaveBeenCalled();
    });
  });
});

describe('PaymentService', () => {
  let service: PaymentService;

  const transaction = {
    id: 'payment-transaction-id',
    orderId: 'ORDER_DEMO_001',
    invoiceId: 'INV_DEMO_001',
    paymentMethod: PaymentMethod.VIETQR,
    provider: PaymentMethod.VIETQR,
    amount: 250000,
    status: PaymentStatus.PENDING,
    gatewayOrderId: 'PAYMENTTRANS',
    qrCode: null,
    qrContent: 'THANH TOAN AIMS',
    qrDataUrl: null,
    transactionId: null,
    transactionContent: null,
    transactionDateTime: null,
    gatewayReferenceNumber: null,
  };

  const mockPrisma = {
    paymentTransaction: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockVietqrService = {
    generateQrCode: jest.fn(),
    mapCallbackToTransactionStatus: jest.fn(),
  };

  const mockPaypalService = {
    createOrder: jest.fn(),
  };

  const mockPlaceOrderPaymentPort = {
    getPaymentContext: jest.fn(),
    markPaidAndPendingProcessing: jest.fn(),
  };

  beforeEach(() => {
    process.env.VIETQR_TRANS_TYPE = 'C';
    service = new PaymentService(
      mockPrisma as any,
      mockVietqrService as any,
      mockPaypalService as any,
      mockPlaceOrderPaymentPort,
    );
    jest.clearAllMocks();
  });

  it('should request VietQR payment and persist QR data', async () => {
    mockPlaceOrderPaymentPort.getPaymentContext.mockResolvedValue({
      orderId: 'ORDER_DEMO_001',
      invoiceId: 'INV_DEMO_001',
      totalAmount: 250000,
      customerEmail: 'customer.demo@gmail.com',
    });
    mockPrisma.paymentTransaction.create.mockResolvedValue(transaction);
    mockPrisma.paymentTransaction.update.mockResolvedValue(transaction);
    mockVietqrService.generateQrCode.mockResolvedValue({
      qrCode: 'qr-code-data',
      qrContent: 'THANH TOAN AIMS',
      amount: 250000,
    });

    const result = await service.requestPayment({
      orderId: 'ORDER_DEMO_001',
      invoiceId: 'INV_DEMO_001',
      paymentMethod: PaymentMethod.VIETQR,
      amount: 250000,
      customerEmail: 'customer.demo@gmail.com',
    });

    expect(mockPrisma.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'ORDER_DEMO_001',
        invoiceId: 'INV_DEMO_001',
        paymentMethod: PaymentMethod.VIETQR,
        status: PaymentStatus.PENDING,
      }),
    });
    expect(mockVietqrService.generateQrCode).toHaveBeenCalled();
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.qrCode).toBe('qr-code-data');
  });

  it('should reject request payment when amount mismatches', async () => {
    mockPlaceOrderPaymentPort.getPaymentContext.mockResolvedValue({
      totalAmount: 250000,
    });

    await expect(
      service.requestPayment({
        orderId: 'ORDER_DEMO_001',
        invoiceId: 'INV_DEMO_001',
        paymentMethod: PaymentMethod.VIETQR,
        amount: 200000,
        customerEmail: 'customer.demo@gmail.com',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('should accept valid VietQR callback and mark order paid', async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(transaction);
    mockPrisma.paymentTransaction.update.mockResolvedValue({
      ...transaction,
      status: PaymentStatus.SUCCESS,
      transactionId: 'TXN001',
    });
    mockVietqrService.mapCallbackToTransactionStatus.mockReturnValue({
      transactionId: 'TXN001',
      status: PaymentStatus.SUCCESS,
      message: 'THANH TOAN AIMS',
      paidAmount: 250000,
    });

    const result = await service.confirmTransactionFromVietqrCallback({
      bankaccount: '123456789',
      amount: 250000,
      transType: 'C',
      content: 'THANH TOAN AIMS',
      transactionid: 'TXN001',
      transactiontime: 1757342061000,
      referencenumber: 'REF001',
      orderId: 'PAYMENTTRANS',
    });

    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: 'payment-transaction-id' },
      data: expect.objectContaining({
        status: PaymentStatus.SUCCESS,
        transactionId: 'TXN001',
      }),
    });
    expect(
      mockPlaceOrderPaymentPort.markPaidAndPendingProcessing,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORDER_DEMO_001',
        invoiceId: 'INV_DEMO_001',
        paymentMethod: PaymentMethod.VIETQR,
        amount: 250000,
        transactionId: 'TXN001',
      }),
    );
    expect(result.duplicate).toBe(false);
  });
});
