import { Injectable, NotFoundException } from '@nestjs/common';
import { IOrderManagerService } from './interfaces/order-manager.service.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GetOrdersDto } from './dto/get-orders.dto';
import { MailService } from '../mail/mail.service';
import { PaymentService } from '../payment/payment.service';
import { getOrderApprovedTemplate } from '../mail/templates/order-approved.template';
import { getOrderRejectedTemplate } from '../mail/templates/order-rejected.template';
import { getOrderRefundConfirmedTemplate } from '../mail/templates/order-refund-confirmed.template';

@Injectable()
export class OrderManagerService implements IOrderManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly paymentService: PaymentService,
  ) {}

  async getAllOrders(
    dto: GetOrdersDto,
  ): Promise<{ data: unknown[]; total: number }> {
    const { status, search, page = 1, limit = 10 } = dto;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: true,
          _count: {
            select: { orderProducts: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map BigInt to string to avoid serialization issues
    const mappedData = data.map((order) => ({
      ...order,
      id: order.id.toString(),
      subtotal: order.subtotal.toNumber(),
      deliveryFee: order.deliveryFee.toNumber(),
      invoice: order.invoice
        ? {
            ...order.invoice,
            id: order.invoice.id.toString(),
            orderId: order.invoice.orderId.toString(),
            totalAmount: order.invoice.totalAmount.toNumber(),
            vatSubtotal: order.invoice.vatSubtotal.toNumber(),
          }
        : null,
      itemsCount: order._count.orderProducts,
    }));

    return { data: mappedData, total };
  }

  async getOrderById(id: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
      include: {
        invoice: true,
        orderProducts: {
          include: {
            product: true,
          },
        },
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      ...order,
      id: order.id.toString(),
      subtotal: order.subtotal.toNumber(),
      deliveryFee: order.deliveryFee.toNumber(),
      invoice: order.invoice
        ? {
            ...order.invoice,
            id: order.invoice.id.toString(),
            orderId: order.invoice.orderId.toString(),
            totalAmount: order.invoice.totalAmount.toNumber(),
            vatSubtotal: order.invoice.vatSubtotal.toNumber(),
          }
        : null,
      orderProducts: order.orderProducts.map((op) => ({
        ...op,
        orderId: op.orderId.toString(),
        productId: op.productId.toString(),
        price: op.price.toNumber(),
        product: {
          ...op.product,
          id: op.product.id.toString(),
          originalValue: op.product.originalValue.toNumber(),
          currentPrice: op.product.currentPrice.toNumber(),
          weight: op.product.weight.toNumber(),
        },
      })),
      paymentTransactions: order.paymentTransactions.map((pt) => ({
        ...pt,
        invoiceId: pt.invoiceId.toString(),
      })),
    };
  }

  async approveOrder(id: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // In a real flow, it might be Pending Processing -> Completed or Shipped
    // Let's use 'Completed' as requested by the user flow or we can define standard ones.
    const updatedOrder = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: { status: 'APPROVED', updatedAt: new Date() },
    });

    if (order.email) {
      const htmlContent = getOrderApprovedTemplate(
        order.orderId,
        order.customerName,
      );
      await this.mailService.sendMail({
        recipientEmail: [order.email],
        subject: `[AIMS] Đơn hàng #${order.orderId} đã được duyệt`,
        html: htmlContent,
      });
    }

    return {
      message: 'Order approved successfully',
      status: updatedOrder.status,
    };
  }

  async rejectOrder(id: string, reason: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: { status: 'REJECTED_BY_MANAGER', updatedAt: new Date() },
    });

    // We should also restore stock if order is cancelled
    const orderProducts = await this.prisma.orderProduct.findMany({
      where: { orderId: BigInt(id) },
    });

    for (const op of orderProducts) {
      await this.prisma.product.update({
        where: { id: op.productId },
        data: { quantity: { increment: op.quantity } },
      });
    }

    // Handle refund logic
    const safeReason = reason || 'Rejected by manager without specific reason';
    await this.paymentService.refundPaidOrder(order.orderId, safeReason);

    // Send email
    if (order.email) {
      const htmlContent = getOrderRejectedTemplate(
        order.orderId,
        order.customerName,
        safeReason,
      );
      await this.mailService.sendMail({
        recipientEmail: [order.email],
        subject: `[AIMS] Đơn hàng #${order.orderId} bị từ chối`,
        html: htmlContent,
      });
    }

    return {
      message: 'Order rejected successfully',
      status: updatedOrder.status,
    };
  }

  async confirmManualRefund(id: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
      include: { invoice: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedTransaction =
      await this.paymentService.markTransactionAsRefunded(order.orderId);

    if (order.email) {
      const refundAmount =
        order.invoice?.totalAmount.toNumber() || order.subtotal.toNumber();
      const htmlContent = getOrderRefundConfirmedTemplate(
        order.orderId,
        order.customerName,
        refundAmount,
      );
      await this.mailService.sendMail({
        recipientEmail: [order.email],
        subject: `[AIMS] Xác nhận hoàn tiền đơn hàng #${order.orderId}`,
        html: htmlContent,
      });
    }

    return {
      message: 'Refund confirmed successfully',
      status: updatedTransaction.status,
    };
  }

  async getRefundOrder(
    dto: GetOrdersDto,
  ): Promise<{ data: unknown[]; total: number }> {
    const { search, page = 1, limit = 10, status } = dto;

    const where: any = {};
    if (status) {
      where.paymentTransactions = {
        some: { status },
      };
    } else {
      where.paymentTransactions = {
        some: {
          status: { in: ['REFUND_REQUIRED', 'REFUNDED'] },
        },
      };
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: true,
          orderProducts: {
            include: { product: true },
            take: 1,
          },
          paymentTransactions: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { orderProducts: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map BigInt to string to avoid serialization issues
    const mappedData = data.map((order) => ({
      ...order,
      id: order.id.toString(),
      subtotal: order.subtotal.toNumber(),
      deliveryFee: order.deliveryFee.toNumber(),
      invoice: order.invoice
        ? {
            ...order.invoice,
            id: order.invoice.id.toString(),
            orderId: order.invoice.orderId.toString(),
            totalAmount: order.invoice.totalAmount.toNumber(),
            vatSubtotal: order.invoice.vatSubtotal.toNumber(),
          }
        : null,
      orderProducts:
        order.orderProducts?.map((op: any) => ({
          ...op,
          orderId: op.orderId.toString(),
          productId: op.productId.toString(),
          price: op.price.toNumber(),
          product: op.product
            ? {
                ...op.product,
                id: op.product.id.toString(),
                originalValue: op.product.originalValue.toNumber(),
                currentPrice: op.product.currentPrice.toNumber(),
                weight: op.product.weight.toNumber(),
              }
            : undefined,
        })) || [],
      paymentTransactions:
        order.paymentTransactions?.map((pt: any) => ({
          ...pt,
          invoiceId: pt.invoiceId?.toString(),
        })) || [],
      itemsCount: order._count.orderProducts,
    }));

    return { data: mappedData, total };
  }
}
