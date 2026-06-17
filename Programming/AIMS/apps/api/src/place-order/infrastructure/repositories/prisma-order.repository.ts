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

/**
 * Adapter (Repository) – the only class allowed to touch Prisma.
 * Normalises Prisma Decimal/BigInt into plain numbers/strings so the domain
 * never depends on persistence types.
 */
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
        await this.decrementStockOrThrow(
          tx,
          line.productId,
          line.quantity,
          true,
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

        // Atomically claim the transition: only the caller that flips
        // PENDING_PAYMENT -> PENDING_PROCESSING is allowed to decrement stock.
        // Duplicate/concurrent payment callbacks get count === 0 and skip the
        // decrement, so stock is never reduced twice (idempotent under races).
        const claimed = await tx.order.updateMany({
          where: { orderId, status: ORDER_STATUS_PENDING_PAYMENT },
          data: {
            status: ORDER_STATUS_PENDING_PROCESSING,
            updatedAt: new Date(),
          },
        });

        if (claimed.count === 1) {
          for (const orderProduct of order.orderProducts) {
            await this.decrementStockOrThrow(
              tx,
              Number(orderProduct.productId),
              orderProduct.quantity,
              false,
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

  // ── helpers ──────────────────────────────────────────────────────────────

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

  /**
   * Atomic conditional decrement (guards against overselling under concurrency).
   * @param useInvalidQuantity when true, throws InvalidQuantityException with the
   *   latest available amount (order-create flow); otherwise a BadRequestException
   *   (paid-callback flow).
   */
  private async decrementStockOrThrow(
    tx: PrismaClientLike,
    productId: number,
    quantity: number,
    useInvalidQuantity: boolean,
  ): Promise<void> {
    const result = await tx.product.updateMany({
      where: { id: BigInt(productId), quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    if (result.count > 0) {
      return;
    }

    if (!useInvalidQuantity) {
      throw new BadRequestException(
        `Insufficient stock for product ${productId}`,
      );
    }

    const latest = await tx.product.findUnique({
      where: { id: BigInt(productId) },
    });

    throw new InvalidQuantityException([
      { productId, requested: quantity, available: latest?.quantity ?? 0 },
    ]);
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
