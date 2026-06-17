import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './constants/payment.constants';
import {
  ensureCanMarkFailed,
  ensureCanMarkSuccess,
} from './helpers/payment-transaction-status.helper';
import { Prisma } from '../prisma/generated/client';

interface GetOrCreateTransactionInput {
  orderId: string;
  invoiceId: bigint;
  paymentMethod: PaymentMethod;
  amount: number;
}

interface MarkSuccessInput {
  transactionId: string;
  data: Record<string, unknown>;
}

interface ExistingPaymentTransaction {
  id: string;
  status: string;
}

/**
 * Owns PaymentTransaction lifecycle rules that are shared across providers.
 */
@Injectable()
export class PaymentTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreatePendingTransaction(input: GetOrCreateTransactionInput) {
    await this.ensureOrderHasNoSuccessfulTransaction(input.orderId);

    const existing = await this.findByOrderAndPaymentMethod(
      input.orderId,
      input.paymentMethod,
    );

    if (existing) {
      return this.reuseTransaction(existing, input);
    }

    try {
      return await this.prisma.paymentTransaction.create({
        data: {
          orderId: input.orderId,
          invoiceId: input.invoiceId,
          paymentMethod: input.paymentMethod,
          provider: input.paymentMethod,
          amount: input.amount,
          status: PaymentStatus.PENDING,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintViolation(error)) {
        throw error;
      }

      const createdByConcurrentRequest = await this.findByOrderAndPaymentMethod(
        input.orderId,
        input.paymentMethod,
      );

      if (!createdByConcurrentRequest) {
        throw error;
      }

      return this.reuseTransaction(createdByConcurrentRequest, input);
    }
  }

  async updateGatewayOrderId(id: string, gatewayOrderId: string) {
    return this.prisma.paymentTransaction.update({
      where: { id },
      data: { gatewayOrderId },
    });
  }

  async updateProviderData(id: string, data: Record<string, unknown>) {
    if (Object.keys(data).length === 0) {
      return this.findRequiredById(id);
    }

    return this.prisma.paymentTransaction.update({
      where: { id },
      data,
    });
  }

  async markFailed(id: string) {
    const transaction = await this.findRequiredById(id);
    ensureCanMarkFailed(transaction.status);

    return this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  async markSuccessAndCancelOtherPending(input: MarkSuccessInput) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: input.transactionId },
      });

      if (!transaction) {
        throw new NotFoundException('Payment transaction not found');
      }

      await this.lockOrderPaymentLifecycle(tx, transaction.orderId);
      ensureCanMarkSuccess(transaction.status);

      const otherSuccess = await tx.paymentTransaction.findFirst({
        where: {
          orderId: transaction.orderId,
          status: PaymentStatus.SUCCESS,
          id: { not: transaction.id },
        },
      });

      if (otherSuccess) {
        throw new BadRequestException('Order already has a successful payment');
      }

      const updated = await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          ...input.data,
          status: PaymentStatus.SUCCESS,
        },
      });

      await tx.paymentTransaction.updateMany({
        where: {
          orderId: updated.orderId,
          status: PaymentStatus.PENDING,
          id: { not: updated.id },
        },
        data: { status: PaymentStatus.FAILED },
      });

      return updated;
    });
  }

  async findById(id: string) {
    return this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
  }

  private async findRequiredById(id: string) {
    const transaction = await this.findById(id);

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return transaction;
  }

  private findByOrderAndPaymentMethod(
    orderId: string,
    paymentMethod: PaymentMethod,
  ) {
    return this.prisma.paymentTransaction.findFirst({
      where: { orderId, paymentMethod },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async reuseTransaction(
    transaction: ExistingPaymentTransaction,
    input: GetOrCreateTransactionInput,
  ) {
    if (transaction.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Order already has a successful payment');
    }

    return this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        provider: this.resolveProvider(input.paymentMethod),
        status: PaymentStatus.PENDING,
      },
    });
  }

  private async ensureOrderHasNoSuccessfulTransaction(orderId: string) {
    const successfulTransaction =
      await this.prisma.paymentTransaction.findFirst({
        where: { orderId, status: PaymentStatus.SUCCESS },
      });

    if (successfulTransaction) {
      throw new BadRequestException('Order already has a successful payment');
    }
  }

  private resolveProvider(paymentMethod: PaymentMethod): PaymentProvider {
    return paymentMethod as unknown as PaymentProvider;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (error as { code?: string })?.code === 'P2002';
  }

  private async lockOrderPaymentLifecycle(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    await tx.$executeRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      orderId,
    );
  }

  async cancelOtherPendingByOrder(
    orderId: string,
    activeTransactionId: string,
  ) {
    return this.prisma.paymentTransaction.updateMany({
      where: {
        orderId,
        status: PaymentStatus.PENDING,
        id: { not: activeTransactionId },
      },
      data: { status: PaymentStatus.FAILED },
    });
  }
}
