import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from './constants/payment.constants';

const STALE_PAYMENT_TIMEOUT_MS: Partial<Record<PaymentMethod, number>> = {
  [PaymentMethod.PAYPAL]: 3 * 60 * 60 * 1000,
  [PaymentMethod.VIETQR]: 30 * 60 * 1000,
};

@Injectable()
export class StalePaymentTransactionCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  async expireStaleTransactions(): Promise<number> {
    let expiredCount = 0;

    for (const [paymentMethod, timeoutMs] of Object.entries(
      STALE_PAYMENT_TIMEOUT_MS,
    ) as [PaymentMethod, number][]) {
      const expiredBefore = new Date(Date.now() - timeoutMs);

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
    }

    return expiredCount;
  }
}
