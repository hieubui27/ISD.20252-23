import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentService } from '../../src/payment/payment.service';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../src/payment/constants/payment.constants';
import { PaymentCompletionService } from '../../src/payment/payment-completion.service';
import { PaymentGatewayTransactionRefResolver } from '../../src/payment/payment-gateway-transaction-ref.resolver';
import { PaymentGatewayOrderIdService } from '../../src/payment/payment-gateway-order-id.service';
import { buildPaymentGatewayOrderId } from '../../src/payment/helpers/payment-reference.helper';
import { StalePaymentTransactionCleanupService } from '../../src/payment/stale-payment-transaction-cleanup.service';
import { VietqrService } from '../../src/vietqr/vietqr.service';
import { VietqrCallbackService } from '../../src/vietqr/vietqr-callback.service';
import { VietqrQrRequestBuilder } from '../../src/vietqr/builders/vietqr-qr-request.builder';
import { VietqrConfigService } from '../../src/vietqr/config/vietqr-config.service';
import { VietqrCallbackResponseMapper } from '../../src/vietqr/mappers/vietqr-callback-response.mapper';
import { VietqrTokenService } from '../../src/vietqr/vietqr-token.service';

describe('VietqrService', () => {
  let service: VietqrService;
  let tokenService: VietqrTokenService;

  const mockVietqrClient = {
    getAccessToken: jest.fn(),
    generateQRCode: jest.fn(),
    testCallback: jest.fn(),
  };
  const configService = new VietqrConfigService();

  beforeEach(() => {
    process.env.VIETQR_USERNAME = 'valid-username';
    process.env.VIETQR_PASSWORD = 'valid-password';
    process.env.VIETQR_BANK_CODE = 'MB';
    process.env.VIETQR_BANK_ACCOUNT = '123456789';
    process.env.VIETQR_USER_BANK_NAME = 'AIMS';
    process.env.VIETQR_QR_TYPE = '0';
    process.env.VIETQR_TRANS_TYPE = 'C';
    jest.clearAllMocks();
    tokenService = new VietqrTokenService(
      mockVietqrClient as any,
      configService,
    );
    service = new VietqrService(
      mockVietqrClient as any,
      tokenService,
      new VietqrQrRequestBuilder(configService),
    );
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
    invoiceId: BigInt(20),
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
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockPaypalService = {
    getGateway: jest.fn(),
    getCreationGateway: jest.fn(),
    getConfirmationGateway: jest.fn(),
    getRefundGateway: jest.fn(),
  };

  const mockPaymentGateway = {
    createPayment: jest.fn(),
  };

  const mockPaymentTransactionService = {
    getOrCreatePendingTransaction: jest.fn(),
    updateGatewayOrderId: jest.fn(),
    updateProviderData: jest.fn(),
    markSuccessAndCancelOtherPending: jest.fn(),
    cancelOtherPendingByOrder: jest.fn(),
  };

  const mockPaymentCompletionService = {
    completeSuccessfulPayment: jest.fn(),
  };

  const mockTransactionRefResolver = {
    resolve: jest.fn(),
  };

  const mockStalePaymentTransactionCleanup = {
    expireStaleTransactions: jest.fn(),
  };

  const mockGatewayOrderIdService = {
    ensureForCreatePayment: jest.fn(),
  };

  const mockOrderPaymentCancellation = {
    cancelPendingPaymentOrderForTransaction: jest.fn(),
  };

  const mockPlaceOrderPaymentPort = {
    getPaymentContext: jest.fn(),
    markPaidAndPendingProcessing: jest.fn(),
  };

  beforeEach(() => {
    process.env.VIETQR_TRANS_TYPE = 'C';
    service = new PaymentService(
      mockPrisma as any,
      mockPaypalService as any,
      mockPaymentTransactionService as any,
      mockPaymentCompletionService as any,
      mockTransactionRefResolver as any,
      mockStalePaymentTransactionCleanup as any,
      mockGatewayOrderIdService as any,
      mockOrderPaymentCancellation as any,
      mockPlaceOrderPaymentPort,
    );
    jest.clearAllMocks();
    mockPaypalService.getGateway.mockReturnValue(mockPaymentGateway);
    mockPaypalService.getCreationGateway.mockReturnValue(mockPaymentGateway);
    mockPaypalService.getConfirmationGateway.mockReturnValue(
      mockPaymentGateway,
    );
    mockPaypalService.getRefundGateway.mockReturnValue(mockPaymentGateway);
    mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });
    mockStalePaymentTransactionCleanup.expireStaleTransactions.mockResolvedValue(
      0,
    );
    mockGatewayOrderIdService.ensureForCreatePayment.mockResolvedValue(
      'PAYMENTTRANS',
    );
    mockPaymentTransactionService.cancelOtherPendingByOrder.mockResolvedValue({
      count: 0,
    });
  });

  it('should request VietQR payment and persist QR data', async () => {
    mockPlaceOrderPaymentPort.getPaymentContext.mockResolvedValue({
      orderId: 'ORDER_DEMO_001',
      invoiceId: '20',
      totalAmount: 250000,
      customerEmail: 'customer.demo@gmail.com',
    });
    mockPaymentTransactionService.getOrCreatePendingTransaction.mockResolvedValue(
      transaction,
    );
    mockPaymentTransactionService.updateGatewayOrderId.mockResolvedValue(
      transaction,
    );
    mockPaymentTransactionService.updateProviderData.mockResolvedValue(
      transaction,
    );
    mockPaymentGateway.createPayment.mockResolvedValue({
      paymentUrl: '',
      qrCode: 'qr-code-data',
      providerData: {
        qrContent: 'THANH TOAN AIMS',
      },
      transactionUpdate: {
        qrCode: 'qr-code-data',
        qrContent: 'THANH TOAN AIMS',
      },
    });

    const result = await service.requestPayment({
      orderId: 'ORDER_DEMO_001',
      invoiceId: '20',
      paymentMethod: PaymentMethod.VIETQR,
      amount: 250000,
      customerEmail: 'customer.demo@gmail.com',
    });

    expect(
      mockPaymentTransactionService.getOrCreatePendingTransaction,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORDER_DEMO_001',
        invoiceId: BigInt(20),
        paymentMethod: PaymentMethod.VIETQR,
      }),
    );
    expect(mockPaymentGateway.createPayment).toHaveBeenCalled();
    expect(
      mockStalePaymentTransactionCleanup.expireStaleTransactions,
    ).toHaveBeenCalled();
    expect(
      mockGatewayOrderIdService.ensureForCreatePayment,
    ).toHaveBeenCalledWith(PaymentMethod.VIETQR, transaction);
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
        invoiceId: '20',
        paymentMethod: PaymentMethod.VIETQR,
        amount: 200000,
        customerEmail: 'customer.demo@gmail.com',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockPaymentTransactionService.getOrCreatePendingTransaction,
    ).not.toHaveBeenCalled();
  });

  it('should reject manual VietQR confirmation because callback owns success', async () => {
    mockPrisma.paymentTransaction.findFirst.mockResolvedValue(transaction);

    await expect(
      service.confirmTransaction({
        orderId: 'ORDER_DEMO_001',
        invoiceId: '20',
        paymentMethod: PaymentMethod.VIETQR,
        transactionId: 'TXN001',
        transactionContent: 'THANH TOAN AIMS',
        transactionDateTime: new Date(1757342061000).toISOString(),
        status: PaymentStatus.SUCCESS,
        amount: 250000,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockPaypalService.getConfirmationGateway).not.toHaveBeenCalled();
    expect(
      mockPaymentCompletionService.completeSuccessfulPayment,
    ).not.toHaveBeenCalled();
  });

  it('should mark refund required when VietQR does not support automatic refund', async () => {
    mockPrisma.paymentTransaction.findFirst.mockResolvedValue({
      ...transaction,
      status: PaymentStatus.SUCCESS,
      transactionId: 'TXN001',
    });
    mockPaypalService.getRefundGateway.mockImplementation(() => {
      throw new BadRequestException(
        'Payment method VIETQR does not support automatic refund',
      );
    });
    mockPrisma.paymentTransaction.update.mockResolvedValue({
      ...transaction,
      status: PaymentStatus.REFUND_REQUIRED,
    });

    const result = await service.refundPaidOrder(
      'ORDER_DEMO_001',
      'Out of stock',
    );

    expect(mockPaypalService.getRefundGateway).toHaveBeenCalledWith(
      PaymentMethod.VIETQR,
    );
    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: 'payment-transaction-id' },
      data: { status: PaymentStatus.REFUND_REQUIRED },
    });
    expect(result).toEqual({
      status: PaymentStatus.REFUND_REQUIRED,
      orderId: 'ORDER_DEMO_001',
      reason: 'Out of stock',
      message:
        'Your refund request has been received. We will contact you shortly to complete the refund.',
    });
  });
});

describe('VietqrCallbackService', () => {
  let service: VietqrCallbackService;

  const transaction = {
    id: 'payment-transaction-id',
    orderId: 'ORDER_DEMO_001',
    invoiceId: BigInt(20),
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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockPaymentCompletionService = {
    completeSuccessfulPayment: jest.fn(),
  };

  beforeEach(() => {
    process.env.VIETQR_TRANS_TYPE = 'C';
    service = new VietqrCallbackService(
      mockPrisma as any,
      new VietqrConfigService(),
      new VietqrCallbackResponseMapper(),
      mockPaymentCompletionService as any,
    );
    jest.clearAllMocks();
  });

  it('should accept valid VietQR callback and mark order paid', async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(transaction);
    mockPaymentCompletionService.completeSuccessfulPayment.mockResolvedValue({
      ...transaction,
      status: PaymentStatus.SUCCESS,
      transactionId: 'TXN001',
    });

    const result = await service.confirmTransactionFromCallback({
      bankaccount: '123456789',
      amount: 250000,
      transType: 'C',
      content: 'THANH TOAN AIMS',
      transactionid: 'TXN001',
      transactiontime: 1757342061000,
      referencenumber: 'REF001',
      orderId: 'PAYMENTTRANS',
    });

    expect(
      mockPaymentCompletionService.completeSuccessfulPayment,
    ).toHaveBeenCalledWith({
      transactionId: 'payment-transaction-id',
      data: expect.objectContaining({
        transactionId: 'TXN001',
      }),
      fallbackProviderTransactionId: 'TXN001',
    });
    expect(result.duplicate).toBe(false);
    expect(result.status).toEqual({
      transactionId: 'TXN001',
      status: PaymentStatus.SUCCESS,
      message: 'THANH TOAN AIMS',
      paidAmount: 250000,
    });
  });
});

describe('PaymentCompletionService', () => {
  const updatedTransaction = {
    id: 'payment-transaction-id',
    orderId: 'ORDER_DEMO_001',
    invoiceId: BigInt(20),
    paymentMethod: PaymentMethod.VIETQR,
    amount: 250000,
    transactionId: 'TXN001',
    transactionContent: 'THANH TOAN AIMS',
    transactionDateTime: new Date(1757342061000),
  };

  const mockPaymentTransactionService = {
    markSuccessAndCancelOtherPending: jest.fn(),
  };

  const mockPlaceOrderPaymentPort = {
    markPaidAndPendingProcessing: jest.fn(),
  };

  let service: PaymentCompletionService;

  beforeEach(() => {
    service = new PaymentCompletionService(
      mockPaymentTransactionService as any,
      mockPlaceOrderPaymentPort as any,
    );
    jest.clearAllMocks();
  });

  it('should mark transaction success and mark order paid', async () => {
    mockPaymentTransactionService.markSuccessAndCancelOtherPending.mockResolvedValue(
      updatedTransaction,
    );

    const result = await service.completeSuccessfulPayment({
      transactionId: 'payment-transaction-id',
      data: {
        transactionId: 'TXN001',
        transactionContent: 'THANH TOAN AIMS',
        transactionDateTime: new Date(1757342061000),
      },
      fallbackProviderTransactionId: 'TXN001',
    });

    expect(
      mockPaymentTransactionService.markSuccessAndCancelOtherPending,
    ).toHaveBeenCalledWith({
      transactionId: 'payment-transaction-id',
      data: expect.objectContaining({
        transactionId: 'TXN001',
        transactionContent: 'THANH TOAN AIMS',
      }),
    });
    expect(
      mockPlaceOrderPaymentPort.markPaidAndPendingProcessing,
    ).toHaveBeenCalledWith({
      orderId: 'ORDER_DEMO_001',
      invoiceId: '20',
      paymentMethod: PaymentMethod.VIETQR,
      amount: 250000,
      transactionId: 'TXN001',
      transactionContent: 'THANH TOAN AIMS',
      transactionDateTime: updatedTransaction.transactionDateTime,
    });
    expect(result).toBe(updatedTransaction);
  });
});

describe('PaymentGatewayTransactionRefResolver', () => {
  const resolver = new PaymentGatewayTransactionRefResolver();

  it('should resolve non-PayPal transaction ref from gateway order id', () => {
    expect(
      resolver.resolve({
        id: 'payment-transaction-id',
        paymentMethod: PaymentMethod.VIETQR,
        gatewayOrderId: 'PAYMENTTRANS',
      }),
    ).toBe('PAYMENTTRANS');
  });

  it('should resolve non-PayPal transaction ref from transaction id fallback', () => {
    expect(
      resolver.resolve({
        id: 'payment-transaction-id',
        paymentMethod: PaymentMethod.VIETQR,
        gatewayOrderId: null,
      }),
    ).toBe('payment-transaction-id');
  });

  it('should reject PayPal transaction without provider order id', () => {
    expect(() =>
      resolver.resolve({
        id: 'payment-transaction-id',
        paymentMethod: PaymentMethod.PAYPAL,
        gatewayOrderId: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('should reject PayPal transaction with local gateway order id', () => {
    expect(() =>
      resolver.resolve({
        id: 'payment-transaction-id',
        paymentMethod: PaymentMethod.PAYPAL,
        gatewayOrderId: buildPaymentGatewayOrderId('payment-transaction-id'),
      }),
    ).toThrow(BadRequestException);
  });

  it('should resolve PayPal transaction ref from provider order id', () => {
    expect(
      resolver.resolve({
        id: 'payment-transaction-id',
        paymentMethod: PaymentMethod.PAYPAL,
        gatewayOrderId: 'PAYPAL-ORDER-ID',
      }),
    ).toBe('PAYPAL-ORDER-ID');
  });
});

describe('PaymentGatewayOrderIdService', () => {
  const mockPaymentTransactionService = {
    updateGatewayOrderId: jest.fn(),
  };

  let service: PaymentGatewayOrderIdService;

  beforeEach(() => {
    service = new PaymentGatewayOrderIdService(
      mockPaymentTransactionService as any,
    );
    jest.clearAllMocks();
  });

  it('should persist and return local gateway order id for VietQR', async () => {
    const result = await service.ensureForCreatePayment(PaymentMethod.VIETQR, {
      id: 'payment-transaction-id',
      gatewayOrderId: 'old-gateway-order-id',
    });

    const expectedGatewayOrderId = buildPaymentGatewayOrderId(
      'payment-transaction-id',
    );

    expect(
      mockPaymentTransactionService.updateGatewayOrderId,
    ).toHaveBeenCalledWith('payment-transaction-id', expectedGatewayOrderId);
    expect(result).toBe(expectedGatewayOrderId);
  });

  it('should reuse existing gateway order id for non-VietQR payments', async () => {
    const result = await service.ensureForCreatePayment(PaymentMethod.PAYPAL, {
      id: 'payment-transaction-id',
      gatewayOrderId: 'PAYPAL-ORDER-ID',
    });

    expect(
      mockPaymentTransactionService.updateGatewayOrderId,
    ).not.toHaveBeenCalled();
    expect(result).toBe('PAYPAL-ORDER-ID');
  });

  it('should use local gateway order id fallback for non-VietQR payments', async () => {
    const result = await service.ensureForCreatePayment(PaymentMethod.PAYPAL, {
      id: 'payment-transaction-id',
      gatewayOrderId: null,
    });

    expect(result).toBe(buildPaymentGatewayOrderId('payment-transaction-id'));
  });
});

describe('StalePaymentTransactionCleanupService', () => {
  const mockPrisma = {
    paymentTransaction: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const mockOrderPaymentCancellation = {
    cancelPendingPaymentOrdersWithOnlyFailedTransactions: jest.fn(),
  };

  let service: StalePaymentTransactionCleanupService;

  beforeEach(() => {
    service = new StalePaymentTransactionCleanupService(
      mockPrisma as any,
      mockOrderPaymentCancellation as any,
    );
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-18T12:00:00.000Z'));
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
    mockOrderPaymentCancellation.cancelPendingPaymentOrdersWithOnlyFailedTransactions.mockResolvedValue(
      0,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should expire stale pending transactions using each payment method timeout', async () => {
    mockPrisma.paymentTransaction.updateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 3 });
    mockPrisma.paymentTransaction.findMany
      .mockResolvedValueOnce([{ orderId: 'ORDER-1' }, { orderId: 'ORDER-2' }])
      .mockResolvedValueOnce([
        { orderId: 'ORDER-3' },
        { orderId: 'ORDER-4' },
        { orderId: 'ORDER-5' },
      ]);

    const result = await service.expireStaleTransactions();

    expect(mockPrisma.paymentTransaction.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        paymentMethod: PaymentMethod.PAYPAL,
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: new Date('2026-06-18T09:00:00.000Z'),
        },
      },
      select: {
        orderId: true,
      },
    });
    expect(mockPrisma.paymentTransaction.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        paymentMethod: PaymentMethod.PAYPAL,
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: new Date('2026-06-18T09:00:00.000Z'),
        },
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
    expect(mockPrisma.paymentTransaction.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        paymentMethod: PaymentMethod.VIETQR,
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: new Date('2026-06-18T11:30:00.000Z'),
        },
      },
      select: {
        orderId: true,
      },
    });
    expect(mockPrisma.paymentTransaction.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        paymentMethod: PaymentMethod.VIETQR,
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: new Date('2026-06-18T11:30:00.000Z'),
        },
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
    expect(
      mockOrderPaymentCancellation.cancelPendingPaymentOrdersWithOnlyFailedTransactions,
    ).toHaveBeenCalledWith([
      'ORDER-1',
      'ORDER-2',
      'ORDER-3',
      'ORDER-4',
      'ORDER-5',
    ]);
    expect(result).toBe(5);
  });

  it('should not expire successful or already failed transactions', async () => {
    mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });

    await service.expireStaleTransactions();

    for (const call of mockPrisma.paymentTransaction.updateMany.mock.calls) {
      expect(call[0].where.status).toBe(PaymentStatus.PENDING);
      expect(call[0].data.status).toBe(PaymentStatus.FAILED);
    }
    expect(
      mockOrderPaymentCancellation.cancelPendingPaymentOrdersWithOnlyFailedTransactions,
    ).toHaveBeenCalledWith([]);
  });
});
