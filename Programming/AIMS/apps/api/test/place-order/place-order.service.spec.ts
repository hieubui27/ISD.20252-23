jest.mock('../../src/mail/mail.service', () => ({
  MailService: class MailService {},
}));

import { BadRequestException } from '@nestjs/common';
import { ShippingFeeService } from '../../src/shared/utils/shipping-fee.service';
import { PlaceOrderBeService } from '../../src/place-order/place-order.service';
import { InvalidDeliveryInfoException } from '../../src/place-order/exceptions/invalid-delivery-info.exception';
import { InvalidQuantityException } from '../../src/place-order/exceptions/invalid-quantity.exception';
import { PaymentNotSuccessfulException } from '../../src/place-order/exceptions/payment-not-successful.exception';

describe('PlaceOrderBeService', () => {
  let service: PlaceOrderBeService;
  let prisma: any;
  let paymentService: any;

  const activeProduct = {
    id: BigInt(1),
    title: 'Clean Code',
    currentPrice: 100000,
    weight: 1000,
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
    prisma = {
      product: {
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      paymentTransaction: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const mailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    } as any;
    paymentService = {
      requestPayment: jest.fn(),
    };
    service = new PlaceOrderBeService(
      prisma,
      new ShippingFeeService(),
      mailService,
      paymentService,
    );
  });

  describe('checkStock', () => {
    it('should return sufficient when all products have enough stock', async () => {
      prisma.product.findMany.mockResolvedValue([activeProduct]);

      const result = await service.checkStock({
        items: [{ productId: 1, quantity: 2 }],
      });

      expect(result).toEqual({
        sufficient: true,
        insufficientItems: [],
      });
    });

    it('should return insufficient item details when stock is not enough', async () => {
      prisma.product.findMany.mockResolvedValue([activeProduct]);

      const result = await service.checkStock({
        items: [{ productId: 1, quantity: 8 }],
      });

      expect(result).toEqual({
        sufficient: false,
        insufficientItems: [{ productId: 1, requested: 8, available: 5 }],
      });
    });

    it('should treat deactivated products as insufficient', async () => {
      prisma.product.findMany.mockResolvedValue([
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
      prisma.product.findMany.mockResolvedValue([]);

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
      prisma.product.findMany.mockResolvedValue([
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
      prisma.product.findMany.mockResolvedValue([activeProduct]);

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
      prisma.product.findMany.mockResolvedValue([
        {
          ...activeProduct,
          title: "Harry Potter and the Philosopher's Stone",
          currentPrice: 125000,
          weight: 250.5,
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
      prisma.product.findMany.mockResolvedValue([
        {
          ...activeProduct,
          title: 'Thriller',
          currentPrice: 159000,
          weight: 100,
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
      const tx = {
        product: {
          findMany: jest.fn().mockResolvedValue([activeProduct]),
        },
        order: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(10),
            orderId: 'PO-1',
          }),
        },
        orderProduct: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        invoice: {
          create: jest.fn().mockResolvedValue({ id: BigInt(20) }),
        },
      };
      prisma.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<unknown>) => callback(tx),
      );
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

      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING_PAYMENT',
        }),
      });
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

    it('should throw InvalidQuantityException when stock is insufficient inside transaction', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            product: {
              findMany: jest
                .fn()
                .mockResolvedValue([{ ...activeProduct, quantity: 0 }]),
            },
          }),
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

    it('should create order, order products, invoice, transaction, payment transaction, and decrement stock with tx client', async () => {
      const tx = {
        product: {
          findMany: jest.fn().mockResolvedValue([activeProduct]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn(),
        },
        order: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(10),
            orderId: 'PO-1',
          }),
        },
        orderProduct: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        invoice: {
          create: jest.fn().mockResolvedValue({ id: BigInt(20) }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
        paymentTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.paymentTransaction.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<unknown>) => callback(tx),
      );

      const result = await service.confirmOrder({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
        transactionId: 'VQR123',
        transactionContent: 'Paid AIMS order',
        transactionDate: '2026-05-26T00:00:00.000Z',
        paymentMethod: 'VIETQR',
      });

      expect(tx.order.create).toHaveBeenCalled();
      expect(tx.orderProduct.createMany).toHaveBeenCalled();
      expect(tx.invoice.create).toHaveBeenCalled();
      expect(tx.transaction.create).toHaveBeenCalled();
      expect(tx.paymentTransaction.create).toHaveBeenCalled();
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
          quantity: { gte: 1 },
        },
        data: {
          quantity: { decrement: 1 },
        },
      });
      expect(prisma.product.findMany).not.toHaveBeenCalled();
      expect(result.transactionId).toBe('VQR123');
    });

    it('should throw InvalidQuantityException if atomic stock decrement fails', async () => {
      const tx = {
        product: {
          findMany: jest.fn().mockResolvedValue([activeProduct]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue({ quantity: 0 }),
        },
        order: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(10),
            orderId: 'PO-1',
          }),
        },
        orderProduct: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        invoice: {
          create: jest.fn().mockResolvedValue({ id: BigInt(20) }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.paymentTransaction.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        orderId: 'PO-1',
        transactionId: 'VQR123',
        transactionContent: 'Paid',
        transactionDateTime: new Date('2026-05-26T00:00:00.000Z'),
      });
      prisma.order.findUnique.mockResolvedValue({
        customerName: 'Nguyen Van A',
        phoneNumber: '0981413168',
        province: 'Hanoi',
        streetAddress: '1 Dai Co Viet',
        invoice: { totalAmount: 110000 },
      });

      const result = await service.confirmOrder({
        items: [{ productId: 1, quantity: 1 }],
        deliveryInfo: validDeliveryInfo,
        transactionId: 'VQR123',
        paymentMethod: 'VIETQR',
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.totalAmount).toBe(110000);
    });
  });
});
