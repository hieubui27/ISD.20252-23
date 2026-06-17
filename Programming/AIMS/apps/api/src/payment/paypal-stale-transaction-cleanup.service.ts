import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from './constants/payment.constants';

@Injectable()
export class PaypalStaleTransactionCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  async expireStaleTransactions(): Promise<number> {
    const expiredBefore = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const result = await this.prisma.paymentTransaction.updateMany({
      where: {
        paymentMethod: PaymentMethod.PAYPAL,
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: expiredBefore,
        },
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    return result.count;
  }
}
