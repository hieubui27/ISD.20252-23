import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../../constants/place-order.constants';
import { InvalidQuantityException } from '../../exceptions/invalid-quantity.exception';
import {
  ConfirmedPaymentInput,
  CreateOrderInput,
  CreatedOrderRef,
  IOrderRepository,
  PaymentTransactionSnapshot,
  PersistedOrderDetail,
  ProductSnapshot,
} from '../../domain/ports/order-repository.port';

type PrismaClientLike = { [key: string]: any };

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProductsByIds(productIds: number[]): Promise<ProductSnapshot[]> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds.map((id) => BigInt(id)) } },
    });

    return products.map((product) => this.toProductSnapshot(product));
  }

  async findPaymentTransactionByTransactionId(
    transactionId: string,
  ): Promise<PaymentTransactionSnapshot | null> {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      return null;
    }

    return {
      orderId: transaction.orderId,
      transactionId: transaction.transactionId,
      transactionContent: transaction.transactionContent,
      transactionDateTime: transaction.transactionDateTime,
      createdAt: transaction.createdAt,
    };
  }

  async findOrderDetailByOrderId(
    orderId: string,
  ): Promise<PersistedOrderDetail | null> {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: {
        invoice: true,
        orderProducts: { include: { product: true } },
      },
    });

    return order ? this.toOrderDetail(order) : null;
  }

  async createPendingPaymentOrder(
    input: CreateOrderInput,
  ): Promise<CreatedOrderRef> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const order = await this.insertOrderWithLinesAndInvoice(tx, input);

      return {
        orderId: order.orderId,
        invoiceId: order.invoiceId,
        totalAmount: Math.round(input.totalAmount),
      };
    });
  }

  async createConfirmedOrder(
    input: CreateOrderInput,
    payment: ConfirmedPaymentInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const order = await this.insertOrderWithLinesAndInvoice(tx, input);

      for (const line of input.lines) {
        await this.decrementStockForOrderCreation(
          tx,
          line.productId,
          line.quantity,
        );
      }

      await tx.paymentTransaction.create({
        data: {
          orderId: order.orderId,
          invoiceId: BigInt(order.invoiceId),
          paymentMethod: payment.paymentMethod,
          provider: payment.provider,
          amount: payment.amount,
          status: payment.status,
          transactionId: payment.transactionId,
          transactionContent: payment.transactionContent,
          transactionDateTime: payment.transactionDateTime,
        },
      });
    });
  }

  async applyPaidTransition(orderId: string): Promise<PersistedOrderDetail> {
    const updated = await this.prisma.$transaction(
      async (tx: PrismaClientLike) => {
        const order = await tx.order.findUnique({
          where: { orderId },
          include: { orderProducts: true },
        });

        if (!order) {
          throw new BadRequestException('Order payment context not found');
        }

        const claimed = await tx.order.updateMany({
          where: { orderId, status: ORDER_STATUS_PENDING_PAYMENT },
          data: {
            status: ORDER_STATUS_PENDING_PROCESSING,
            updatedAt: new Date(),
          },
        });

        if (claimed.count === 1) {
          for (const orderProduct of order.orderProducts) {
            await this.decrementStockForPaidCallback(
              tx,
              Number(orderProduct.productId),
              orderProduct.quantity,
            );
          }
        }

        return tx.order.findUnique({
          where: { orderId },
          include: {
            invoice: true,
            orderProducts: { include: { product: true } },
          },
        });
      },
    );

    return this.toOrderDetail(updated);
  }

  private async insertOrderWithLinesAndInvoice(
    tx: PrismaClientLike,
    input: CreateOrderInput,
  ): Promise<{ orderId: string; invoiceId: string }> {
    const order = await tx.order.create({
      data: {
        orderId: input.orderCode,
        customerName: input.customerName,
        phoneNumber: input.phoneNumber,
        email: input.email,
        streetAddress: input.streetAddress,
        province: input.province,
        deliveryMethod: input.deliveryMethod,
        deliveryFee: input.deliveryFee,
        subtotal: input.subtotal,
        status: input.status,
      },
    });

    await tx.orderProduct.createMany({
      data: input.lines.map((line) => ({
        orderId: order.id,
        productId: BigInt(line.productId),
        quantity: line.quantity,
        price: line.price,
      })),
    });

    const invoice = await tx.invoice.create({
      data: {
        orderId: order.id,
        vatSubtotal: input.vatSubtotal,
        totalAmount: input.totalAmount,
      },
    });

    return { orderId: order.orderId, invoiceId: invoice.id.toString() };
  }

  private async tryDecrementStock(
    tx: PrismaClientLike,
    productId: number,
    quantity: number,
  ): Promise<boolean> {
    const result = await tx.product.updateMany({
      where: { id: BigInt(productId), quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    return result.count > 0;
  }

  private async decrementStockForOrderCreation(
    tx: PrismaClientLike,
    productId: number,
    quantity: number,
  ): Promise<void> {
    if (await this.tryDecrementStock(tx, productId, quantity)) {
      return;
    }

    const latest = await tx.product.findUnique({
      where: { id: BigInt(productId) },
    });

    throw new InvalidQuantityException([
      { productId, requested: quantity, available: latest?.quantity ?? 0 },
    ]);
  }

  private async decrementStockForPaidCallback(
    tx: PrismaClientLike,
    productId: number,
    quantity: number,
  ): Promise<void> {
    if (await this.tryDecrementStock(tx, productId, quantity)) {
      return;
    }

    throw new BadRequestException(
      `Insufficient stock for product ${productId}`,
    );
  }

  private toProductSnapshot(product: any): ProductSnapshot {
    return {
      id: Number(product.id),
      title: product.title,
      currentPrice: Number(product.currentPrice),
      weightGrams: Number(product.weight),
      quantity: product.quantity,
      status: product.status,
    };
  }

  private toOrderDetail(order: any): PersistedOrderDetail {
    return {
      orderId: order.orderId,
      status: order.status,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      email: order.email,
      streetAddress: order.streetAddress,
      province: order.province,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      invoice: order.invoice
        ? {
            id: order.invoice.id.toString(),
            vatSubtotal: Number(order.invoice.vatSubtotal),
            totalAmount: Number(order.invoice.totalAmount),
          }
        : null,
      lines: (order.orderProducts ?? []).map((orderProduct: any) => ({
        productId: Number(orderProduct.productId),
        quantity: orderProduct.quantity,
        price: Number(orderProduct.price),
        title: orderProduct.product?.title,
        weightGrams:
          orderProduct.product?.weight !== undefined &&
          orderProduct.product?.weight !== null
            ? Number(orderProduct.product.weight)
            : undefined,
      })),
    };
  }
}
