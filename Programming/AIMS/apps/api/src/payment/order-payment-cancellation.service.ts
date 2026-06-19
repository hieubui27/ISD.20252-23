import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from './constants/payment.constants';

const ORDER_STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
const ORDER_STATUS_CANCELLED = 'CANCELLED_BY_CUSTOMER';

@Injectable()
export class OrderPaymentCancellationService {
  constructor(private readonly prisma: PrismaService) {}

  async cancelPendingPaymentOrderForTransaction(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (
      transaction.status !== PaymentStatus.PENDING &&
      transaction.status !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot cancel transaction from ${transaction.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTransaction =
        transaction.status === PaymentStatus.PENDING
          ? await tx.paymentTransaction.update({
              where: { id: transaction.id },
              data: { status: PaymentStatus.FAILED },
            })
          : transaction;

      const updatedOrder = await tx.order.updateMany({
        where: {
          orderId: transaction.orderId,
          status: ORDER_STATUS_PENDING_PAYMENT,
        },
        data: { status: ORDER_STATUS_CANCELLED, updatedAt: new Date() },
      });

      if (updatedOrder.count === 0) {
        throw new BadRequestException(
          'Only pending payment orders can be cancelled from payment page',
        );
      }

      return {
        orderId: transaction.orderId,
        orderStatus: ORDER_STATUS_CANCELLED,
        transactionId: updatedTransaction.id,
        transactionStatus: updatedTransaction.status,
      };
    });
  }

  async cancelPendingPaymentOrdersWithOnlyFailedTransactions(
    orderIds: string[],
  ): Promise<number> {
    let cancelledCount = 0;

    for (const orderId of new Set(orderIds)) {
      const activeTransaction = await this.prisma.paymentTransaction.findFirst({
        where: {
          orderId,
          status: { not: PaymentStatus.FAILED },
        },
      });

      if (activeTransaction) {
        continue;
      }

      const updatedOrder = await this.prisma.order.updateMany({
        where: {
          orderId,
          status: ORDER_STATUS_PENDING_PAYMENT,
        },
        data: { status: ORDER_STATUS_CANCELLED, updatedAt: new Date() },
      });

      cancelledCount += updatedOrder.count;
    }

    return cancelledCount;
  }
}
