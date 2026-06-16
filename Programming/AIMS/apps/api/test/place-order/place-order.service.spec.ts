import { BadRequestException } from '@nestjs/common';
import { DeliveryInfoValidator } from '../../src/place-order/domain/validators/delivery-info.validator';
import { PlaceOrderBeService } from '../../src/place-order/application/place-order.service';
import { OrderFactory } from '../../src/place-order/domain/factories/order.factory';
import { InvoiceCalculator } from '../../src/place-order/domain/services/invoice-calculator.service';
import { OrderValidationService } from '../../src/place-order/domain/services/order-validation.service';
import { StockCheckerService } from '../../src/place-order/domain/services/stock-checker.service';
import { WeightBasedShippingStrategy } from '../../src/place-order/infrastructure/adapter/weight-based-shipping.strategy';
import { InvalidDeliveryInfoException } from '../../src/place-order/exceptions/invalid-delivery-info.exception';
import { InvalidQuantityException } from '../../src/place-order/exceptions/invalid-quantity.exception';
import { PaymentNotSuccessfulException } from '../../src/place-order/exceptions/payment-not-successful.exception';

/**
 * After the SOLID refactor the facade depends only on abstractions, so the test
 * mocks the repository + event publisher and uses the real (pure) domain
 * collaborators. This is itself evidence of the improved low coupling.
 */
describe('PlaceOrderBeService', () => {
  let service: PlaceOrderBeService;
  let repository: any;
  let eventPublisher: any;
  let paymentService: any;

  // ProductSnapshot read-model returned by the repository.
  const activeProduct = {
    id: 1,
    title: 'Clean Code',
    currentPrice: 100000,
    weightGrams: 1000,
    quantity: 5,
    status: 'AVAILABLE',
  };

  const validDeliveryInfo = {
    receiverName: 'Nguyen Van A',
    phoneNumber: '0981413168',
    province: 'Hanoi',
    streetAddress: '1 Dai Co Viet',
    email: 'customer@example.com',
  };

  beforeEach(() => {
    repository = {
      findProductsByIds: jest.fn(),
      findPaymentTransactionByTransactionId: jest.fn(),
      findOrderDetailByOrderId: jest.fn(),
      createPendingPaymentOrder: jest.fn(),
      createConfirmedOrder: jest.fn().mockResolvedValue(undefined),
      applyPaidTransition: jest.fn(),
    };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    paymentService = { requestPayment: jest.fn() };

    const invoiceCalculator = new InvoiceCalculator(
      new WeightBasedShippingStrategy(),
    );

    service = new PlaceOrderBeService(
      repository,
      new OrderValidationService(new DeliveryInfoValidator()),
      new StockCheckerService(),
      invoiceCalculator,
      new OrderFactory(),
      eventPublisher,
      paymentService,
    );
  });

  describe('checkStock', () => {
    it('should return sufficient when all products have enough stock', async () => {
      repository.findProductsByIds.mockResolvedValue([activeProduct]);

      const result = await service.checkStock({
        items: [{ productId: 1, quantity: 2 }],
      });

      expect(result).toEqual({ sufficient: true, insufficientItems: [] });
    });

    it('should return insufficient item details when stock is not enough', async () => {
      repository.findProductsByIds.mockResolvedValue([activeProduct]);

      const result = await service.checkStock({
        items: [{ productId: 1, quantity: 8 }],
      });

      expect(result).toEqual({
        sufficient: false,
        insufficientItems: [{ productId: 1, requested: 8, available: 5 }],
      });
    });

    it('should treat deactivated products as insufficient', async () => {
      repository.findProductsByIds.mockResolvedValue([
        { ...activeProduct, status: 'DEACTIVATED' },
      ]);

      const result = await service.checkStock({
        items: [{ productId: 1, quantity: 1 }],
      });

      expect(result.insufficientItems).toEqual([
        { productId: 1, requested: 1, available: 0 },
      ]);
    });

    it('should treat missing products as insufficient', async () => {
      repository.findProductsByIds.mockResolvedValue([]);

      const result = await service.checkStock({
        items: [{ productId: 99, quantity: 1 }],
      });

      expect(result.insufficientItems).toEqual([
        { productId: 99, requested: 1, available: 0 },
      ]);
    });

    it('should reject empty items array', async () => {
      await expect(service.checkStock({ items: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject quantity less than or equal to zero', async () => {
      await expect(
        service.checkStock({ items: [{ productId: 1, quantity: 0 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-integer quantity', async () => {
      await expect(
        service.checkStock({ items: [{ productId: 1, quantity: 1.5 }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processDeliveryInfo', () => {
    it('should throw InvalidDeliveryInfoException for invalid delivery info', async () => {
      await expect(
        service.processDeliveryInfo({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: { ...validDeliveryInfo, receiverName: 'Nguyen 1' },
        }),
      ).rejects.toThrow(InvalidDeliveryInfoException);
    });

    it('should throw InvalidQuantityException when stock is insufficient', async () => {
      repository.findProductsByIds.mockResolvedValue([
        { ...activeProduct, quantity: 0 },
      ]);

      await expect(
        service.processDeliveryInfo({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: validDeliveryInfo,
        }),
      ).rejects.toThrow(InvalidQuantityException);
    });

    it('should build invoice preview from database price and gram weight', async () => {
      repository.findProductsByIds.mockResolvedValue([activeProduct]);

      const result = await service.processDeliveryInfo({
        items: [{ productId: 1, quantity: 2, price: 1, weight: 100 }],
        deliveryInfo: validDeliveryInfo,
      });

      expect(result.items).toEqual([
        {
          productId: 1,
          title: 'Clean Code',
          price: 100000,
          quantity: 2,
          amount: 200000,
          weight: 1,
        },
      ]);
      expect(result.subtotalBeforeVat).toBe(200000);
      expect(result.vatAmount).toBe(20000);
      expect(result.subtotalAfterVat).toBe(220000);
      expect(result.deliveryFee).toBe(0);
      expect(result.totalAmount).toBe(220000);
    });

    it('should convert product gram weights to kilograms before calculating shipping', async () => {
      repository.findProductsByIds.mockResolvedValue([
        {
          ...activeProduct,
          title: "Harry Potter and the Philosopher's Stone",
          currentPrice: 125000,
          weightGrams: 250.5,
        },
      ]);

      const result = await service.processDeliveryInfo({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
      });

      expect(result.items[0].weight).toBe(0.2505);
      expect(result.subtotalBeforeVat).toBe(125000);
      expect(result.vatAmount).toBe(12500);
      expect(result.subtotalAfterVat).toBe(137500);
      expect(result.deliveryFee).toBe(0);
      expect(result.totalAmount).toBe(137500);
    });

    it('should not charge oversized shipping when Thriller has 100 grams weight', async () => {
      repository.findProductsByIds.mockResolvedValue([
        {
          ...activeProduct,
          title: 'Thriller',
          currentPrice: 159000,
          weightGrams: 100,
        },
      ]);

      const result = await service.processDeliveryInfo({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
      });

      expect(result.items[0].weight).toBe(0.1);
      expect(result.subtotalBeforeVat).toBe(159000);
      expect(result.vatAmount).toBe(15900);
      expect(result.deliveryFee).toBe(0);
      expect(result.totalAmount).toBe(174900);
    });
  });

  describe('createPayment', () => {
    it('should create a pending order and request VietQR payment', async () => {
      repository.findProductsByIds.mockResolvedValue([activeProduct]);
      repository.createPendingPaymentOrder.mockResolvedValue({
        orderId: 'PO-1',
        invoiceId: '20',
        totalAmount: 132000,
      });
      paymentService.requestPayment.mockResolvedValue({
        status: 'PENDING',
        paymentMethod: 'VIETQR',
        paymentUrl: '',
        qrCode: 'qr-code-data',
        transactionId: 'payment-transaction-id',
        message: 'VietQR payment request created',
      });

      const result = await service.createPayment({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
        paymentMethod: 'VIETQR' as any,
      });

      expect(repository.createPendingPaymentOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING_PAYMENT' }),
      );
      expect(paymentService.requestPayment).toHaveBeenCalledWith({
        orderId: 'PO-1',
        invoiceId: '20',
        paymentMethod: 'VIETQR',
        amount: 132000,
        customerEmail: 'customer@example.com',
      });
      expect(result).toEqual(
        expect.objectContaining({
          orderId: 'PO-1',
          invoiceId: '20',
          totalAmount: 132000,
          qrCode: 'qr-code-data',
        }),
      );
    });
  });

  describe('confirmOrder', () => {
    it('should throw PaymentNotSuccessfulException when transaction id is missing', async () => {
      await expect(
        service.confirmOrder({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: validDeliveryInfo,
          transactionId: '',
          paymentMethod: 'VIETQR',
        }),
      ).rejects.toThrow(PaymentNotSuccessfulException);
    });

    it('should throw PaymentNotSuccessfulException when payment method is missing', async () => {
      await expect(
        service.confirmOrder({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: validDeliveryInfo,
          transactionId: 'VQR123',
          paymentMethod: '',
        }),
      ).rejects.toThrow(PaymentNotSuccessfulException);
    });

    it('should throw InvalidQuantityException when stock is insufficient', async () => {
      repository.findPaymentTransactionByTransactionId.mockResolvedValue(null);
      repository.findProductsByIds.mockResolvedValue([
        { ...activeProduct, quantity: 0 },
      ]);

      await expect(
        service.confirmOrder({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: validDeliveryInfo,
          transactionId: 'VQR123',
          paymentMethod: 'VIETQR',
        }),
      ).rejects.toThrow(InvalidQuantityException);
    });

    it('should persist a confirmed order through the repository and notify', async () => {
      repository.findPaymentTransactionByTransactionId.mockResolvedValue(null);
      repository.findProductsByIds.mockResolvedValue([activeProduct]);

      const result = await service.confirmOrder({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
        transactionId: 'VQR123',
        transactionContent: 'Paid AIMS order',
        transactionDate: '2026-05-26T00:00:00.000Z',
        paymentMethod: 'VIETQR',
      });

      expect(repository.createConfirmedOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING_PROCESSING' }),
        expect.objectContaining({
          transactionId: 'VQR123',
          status: 'SUCCESS',
          provider: 'PLACE_ORDER',
        }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmail: 'customer@example.com' }),
      );
      expect(result.transactionId).toBe('VQR123');
    });

    it('should propagate InvalidQuantityException raised by the repository', async () => {
      repository.findPaymentTransactionByTransactionId.mockResolvedValue(null);
      repository.findProductsByIds.mockResolvedValue([activeProduct]);
      repository.createConfirmedOrder.mockRejectedValue(
        new InvalidQuantityException([
          { productId: 1, requested: 1, available: 0 },
        ]),
      );

      await expect(
        service.confirmOrder({
          items: [{ productId: 1, quantity: 1 }],
          deliveryInfo: validDeliveryInfo,
          transactionId: 'VQR123',
          paymentMethod: 'VIETQR',
        }),
      ).rejects.toThrow(InvalidQuantityException);
    });

    it('should return existing order success response for duplicate transaction id', async () => {
      repository.findPaymentTransactionByTransactionId.mockResolvedValue({
        orderId: 'PO-1',
        transactionId: 'VQR123',
        transactionContent: 'Paid',
        transactionDateTime: new Date('2026-05-26T00:00:00.000Z'),
        createdAt: new Date('2026-05-26T00:00:00.000Z'),
      });
      repository.findOrderDetailByOrderId.mockResolvedValue({
        orderId: 'PO-1',
        status: 'PENDING_PROCESSING',
        customerName: 'Nguyen Van A',
        phoneNumber: '0981413168',
        province: 'Hanoi',
        streetAddress: '1 Dai Co Viet',
        email: 'customer@example.com',
        subtotal: 100000,
        deliveryFee: 0,
        invoice: { id: '20', vatSubtotal: 110000, totalAmount: 110000 },
        lines: [],
      });

      const result = await service.confirmOrder({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
        transactionId: 'VQR123',
        paymentMethod: 'VIETQR',
      });

      expect(repository.createConfirmedOrder).not.toHaveBeenCalled();
      expect(result.totalAmount).toBe(110000);
    });
  });
});
