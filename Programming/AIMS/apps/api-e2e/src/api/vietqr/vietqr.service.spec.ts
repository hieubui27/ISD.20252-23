import {
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentService } from '../../../../api/src/payment/payment.service';
import {
  VietqrCallbackDto,
  VietqrQRCodeRequest,
  VietqrService,
} from '../../../../api/src/vietqr/vietqr.service';

describe('VietqrService', () => {
  let service: VietqrService;

  const mockVietqrClient = {
    getAccessToken: jest.fn(),
    generateQRCode: jest.fn(),
  };

  const mockOrderRepository = {
    findByOrderId: jest.fn(),
    markPaidAndPendingProcessing: jest.fn(),
  };

  const mockPaymentTransactionRepository = {
    existsByTransactionId: jest.fn(),
    save: jest.fn(),
  };

  const mockSignatureValidator = {
    isValid: jest.fn(),
  };

  const options = {
    clientId: 'valid-client-id',
    apiKey: 'valid-api-key',
  };

  beforeEach(() => {
    service = new VietqrService(
      mockVietqrClient,
      mockOrderRepository,
      mockPaymentTransactionRepository,
      mockSignatureValidator,
      options,
    );
    jest.clearAllMocks();
  });

  describe('getAccessToken (UT_VQR_001 to UT_VQR_002)', () => {
    // UT_VQR_001
    it('should get access token successfully (UT_VQR_001)', async () => {
      mockVietqrClient.getAccessToken.mockResolvedValue({
        accessToken: 'valid-access-token',
      });

      const result = await service.getAccessToken();

      expect(mockVietqrClient.getAccessToken).toHaveBeenCalledWith(
        'valid-client-id',
        'valid-api-key',
      );
      expect(result).toBe('valid-access-token');
      expect(result).not.toBe('');
      expect(service.getCachedAccessToken()).toBe('valid-access-token');
    });

    // UT_VQR_002
    it('should throw authentication error when access token failed (UT_VQR_002)', async () => {
      mockVietqrClient.getAccessToken.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.getCachedAccessToken()).toBeUndefined();
    });
  });

  describe('generateQRCode (UT_VQR_003 to UT_VQR_005)', () => {
    const request: VietqrQRCodeRequest = {
      orderId: 'ORDER001',
      amount: 250000,
      content: 'PAY ORDER001',
    };

    // UT_VQR_003
    it('should generate QR code successfully (UT_VQR_003)', async () => {
      mockVietqrClient.getAccessToken.mockResolvedValue({
        accessToken: 'valid-access-token',
      });
      mockVietqrClient.generateQRCode.mockResolvedValue({
        qrCode: 'qr-code-data',
        qrContent: 'PAY ORDER001',
        amount: 250000,
        orderId: 'ORDER001',
      });

      const result = await service.generateQRCode(request);

      expect(mockVietqrClient.generateQRCode).toHaveBeenCalledWith(
        'valid-access-token',
        request,
      );
      expect(result).toEqual({
        qrCode: 'qr-code-data',
        qrContent: 'PAY ORDER001',
        amount: 250000,
        orderId: 'ORDER001',
      });
    });

    // UT_VQR_004
    it('should throw QR generation error when VietQR API failed (UT_VQR_004)', async () => {
      mockVietqrClient.getAccessToken.mockResolvedValue({
        accessToken: 'valid-access-token',
      });
      mockVietqrClient.generateQRCode.mockRejectedValue(
        new Error('VietQR API error'),
      );

      await expect(service.generateQRCode(request)).rejects.toThrow(
        BadGatewayException,
      );
    });

    // UT_VQR_005
    it('should reject invalid amount (UT_VQR_005)', async () => {
      await expect(
        service.generateQRCode({
          orderId: 'ORDER001',
          amount: 0,
          content: 'PAY ORDER001',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockVietqrClient.generateQRCode).not.toHaveBeenCalled();
    });
  });

  describe('handleCallback (UT_VQR_006 to UT_VQR_009)', () => {
    const callback: VietqrCallbackDto = {
      orderId: 'ORDER001',
      transactionId: 'TXN001',
      amount: 250000,
      status: 'SUCCESS',
      signature: 'valid-signature',
    };

    // UT_VQR_006
    it('should accept valid payment callback (UT_VQR_006)', async () => {
      mockSignatureValidator.isValid.mockReturnValue(true);
      mockPaymentTransactionRepository.existsByTransactionId.mockResolvedValue(
        false,
      );
      mockOrderRepository.findByOrderId.mockResolvedValue({
        orderId: 'ORDER001',
        totalAmount: 250000,
      });

      const result = await service.handleCallback(callback);

      expect(mockPaymentTransactionRepository.save).toHaveBeenCalledWith({
        orderId: 'ORDER001',
        transactionId: 'TXN001',
        amount: 250000,
        method: 'VIETQR',
        status: 'SUCCESS',
      });
      expect(mockOrderRepository.markPaidAndPendingProcessing).toHaveBeenCalledWith(
        'ORDER001',
      );
      expect(result).toEqual({
        status: 'ACCEPTED',
        transactionId: 'TXN001',
      });
    });

    // UT_VQR_007
    it('should reject invalid signature (UT_VQR_007)', async () => {
      mockSignatureValidator.isValid.mockReturnValue(false);

      await expect(
        service.handleCallback({
          ...callback,
          signature: 'invalid-signature',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPaymentTransactionRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderRepository.markPaidAndPendingProcessing,
      ).not.toHaveBeenCalled();
    });

    // UT_VQR_008
    it('should reject amount mismatch (UT_VQR_008)', async () => {
      mockSignatureValidator.isValid.mockReturnValue(true);
      mockPaymentTransactionRepository.existsByTransactionId.mockResolvedValue(
        false,
      );
      mockOrderRepository.findByOrderId.mockResolvedValue({
        orderId: 'ORDER001',
        totalAmount: 250000,
      });

      await expect(
        service.handleCallback({
          ...callback,
          amount: 200000,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPaymentTransactionRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderRepository.markPaidAndPendingProcessing,
      ).not.toHaveBeenCalled();
    });

    // UT_VQR_009
    it('should prevent duplicate transaction (UT_VQR_009)', async () => {
      mockSignatureValidator.isValid.mockReturnValue(true);
      mockPaymentTransactionRepository.existsByTransactionId.mockResolvedValue(
        true,
      );

      const result = await service.handleCallback(callback);

      expect(result).toEqual({
        status: 'DUPLICATE',
        transactionId: 'TXN001',
      });
      expect(mockPaymentTransactionRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderRepository.markPaidAndPendingProcessing,
      ).not.toHaveBeenCalled();
    });
  });
});

describe('PaymentService', () => {
  let service: PaymentService;

  const mockOrderRepository = {
    findByOrderId: jest.fn(),
    markRejected: jest.fn(),
  };

  const mockNotificationService = {
    notifyProductManagerManualRefund: jest.fn(),
  };

  const mockRefundClient = {
    refund: jest.fn(),
  };

  beforeEach(() => {
    service = new PaymentService(
      mockOrderRepository,
      mockNotificationService,
      mockRefundClient,
    );
    jest.clearAllMocks();
  });

  describe('rejectPaidVietQROrder (UT_VQR_010)', () => {
    // UT_VQR_010
    it('should notify manual refund required when paid VietQR order is rejected (UT_VQR_010)', async () => {
      mockOrderRepository.findByOrderId.mockResolvedValue({
        orderId: 'ORDER001',
        paymentMethod: 'VIETQR',
        status: 'PAID',
      });

      const result = await service.rejectPaidVietQROrder(
        'ORDER001',
        'Out of stock',
      );

      expect(mockOrderRepository.markRejected).toHaveBeenCalledWith(
        'ORDER001',
        'Out of stock',
      );
      expect(
        mockNotificationService.notifyProductManagerManualRefund,
      ).toHaveBeenCalledWith({
        orderId: 'ORDER001',
        paymentMethod: 'VIETQR',
        rejectReason: 'Out of stock',
      });
      expect(mockRefundClient.refund).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'MANUAL_REFUND_REQUIRED',
        orderId: 'ORDER001',
      });
    });
  });
});
