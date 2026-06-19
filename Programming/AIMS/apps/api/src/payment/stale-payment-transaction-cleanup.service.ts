import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from './constants/payment.constants';
import { OrderPaymentCancellationService } from './order-payment-cancellation.service';

const STALE_PAYMENT_TIMEOUT_MS: Partial<Record<PaymentMethod, number>> = {
  [PaymentMethod.PAYPAL]: 3 * 60 * 60 * 1000,
  [PaymentMethod.VIETQR]: 2 * 60 * 1000,
};

@Injectable()
export class StalePaymentTransactionCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderPaymentCancellation: OrderPaymentCancellationService,
  ) {}

  async expireStaleTransactions(): Promise<number> {
    let expiredCount = 0;
    const affectedOrderIds: string[] = [];

    for (const [paymentMethod, timeoutMs] of Object.entries(
      STALE_PAYMENT_TIMEOUT_MS,
    ) as [PaymentMethod, number][]) {
      const expiredBefore = new Date(Date.now() - timeoutMs);
      const staleTransactions = await this.prisma.paymentTransaction.findMany({
        where: {
          paymentMethod,
          status: PaymentStatus.PENDING,
          createdAt: {
            lt: expiredBefore,
          },
        },
        select: {
          orderId: true,
        },
      });

      const result = await this.prisma.paymentTransaction.updateMany({
        where: {
          paymentMethod,
          status: PaymentStatus.PENDING,
          createdAt: {
            lt: expiredBefore,
          },
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      expiredCount += result.count;
      affectedOrderIds.push(
        ...staleTransactions
          .slice(0, result.count)
          .map(({ orderId }) => orderId),
      );
    }

    await this.orderPaymentCancellation.cancelPendingPaymentOrdersWithOnlyFailedTransactions(
      affectedOrderIds,
    );

    return expiredCount;
  }
}
