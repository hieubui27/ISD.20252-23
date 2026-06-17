import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
} from '../payment/constants/payment.constants';
import { TransactionStatusDto } from '../payment/dto/transaction-status.dto';
import { PaymentCompletionService } from '../payment/payment-completion.service';
import { PrismaService } from '../prisma/prisma.service';
import { VietqrConfigService } from './config/vietqr-config.service';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { VietqrCallbackResponseMapper } from './mappers/vietqr-callback-response.mapper';

@Injectable()
export class VietqrCallbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: VietqrConfigService,
    private readonly responseMapper: VietqrCallbackResponseMapper,
    private readonly paymentCompletionService: PaymentCompletionService,
  ) {}

  async confirmTransactionFromCallback(
    callback: TransactionSyncDto,
  ): Promise<{
    status: TransactionStatusDto;
    refTransactionId: string;
    duplicate: boolean;
  }> {
    if (callback.transType !== this.configService.getTransType()) {
      throw new BadRequestException('Invalid VietQR transaction type');
    }

    const duplicate = await this.findDuplicateCallback(callback);
    if (duplicate) {
      return {
        status: {
          transactionId: callback.transactionid,
          status: duplicate.status,
          message: 'Transaction already processed',
          paidAmount: callback.amount,
        },
        refTransactionId: duplicate.id,
        duplicate: true,
      };
    }

    const transaction = await this.findVietqrTransaction(callback);
    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.amount !== callback.amount) {
      throw new BadRequestException('Amount mismatch');
    }

    if (transaction.status === PaymentStatus.SUCCESS) {
      return {
        status: {
          transactionId: callback.transactionid,
          status: transaction.status,
          message: 'Transaction already processed',
          paidAmount: callback.amount,
        },
        refTransactionId: transaction.id,
        duplicate: true,
      };
    }

    const updated = await this.paymentCompletionService.completeSuccessfulPayment(
      {
        transactionId: transaction.id,
        data: {
          transactionId: callback.transactionid,
          transactionContent: callback.content,
          transactionDateTime: new Date(callback.transactiontime),
          gatewayReferenceNumber: callback.referencenumber,
        },
        fallbackProviderTransactionId: callback.transactionid,
      },
    );

    return {
      status: this.responseMapper.toTransactionStatus(callback),
      refTransactionId: updated.id,
      duplicate: false,
    };
  }

  private async findDuplicateCallback(callback: TransactionSyncDto) {
    const byTransactionId = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: callback.transactionid },
    });

    if (byTransactionId) {
      return byTransactionId;
    }

    if (!callback.referencenumber) {
      return null;
    }

    return this.prisma.paymentTransaction.findFirst({
      where: { gatewayReferenceNumber: callback.referencenumber },
    });
  }

  private async findVietqrTransaction(callback: TransactionSyncDto) {
    const lookupConditions: Record<string, unknown>[] = [];

    if (callback.orderId) {
      lookupConditions.push({ gatewayOrderId: callback.orderId });
    }

    if (callback.content) {
      lookupConditions.push({ qrContent: callback.content });
    }

    if (lookupConditions.length === 0) {
      return null;
    }

    return this.prisma.paymentTransaction.findFirst({
      where: {
        provider: PaymentProvider.VIETQR,
        OR: lookupConditions,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
