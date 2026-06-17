import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
} from '../payment/constants/payment.constants';
import { TransactionStatusDto } from '../payment/dto/transaction-status.dto';
import {
  PLACE_ORDER_PAYMENT_PORT,
  PlaceOrderPaymentPort,
} from '../payment/ports/place-order-payment.port';
import { PaymentTransactionService } from '../payment/payment-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { VietqrService } from './vietqr.service';

@Injectable()
export class VietqrCallbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vietqrService: VietqrService,
    private readonly paymentTransactionService: PaymentTransactionService,
    @Inject(PLACE_ORDER_PAYMENT_PORT)
    private readonly placeOrderPaymentPort: PlaceOrderPaymentPort,
  ) {}

  async confirmTransactionFromCallback(
    callback: TransactionSyncDto,
  ): Promise<{
    status: TransactionStatusDto;
    refTransactionId: string;
    duplicate: boolean;
  }> {
    if (callback.transType !== (process.env.VIETQR_TRANS_TYPE || 'C')) {
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

    const updated =
      await this.paymentTransactionService.markSuccessAndCancelOtherPending({
        transactionId: transaction.id,
        data: {
          transactionId: callback.transactionid,
          transactionContent: callback.content,
          transactionDateTime: new Date(callback.transactiontime),
          gatewayReferenceNumber: callback.referencenumber,
        },
      });

    await this.placeOrderPaymentPort.markPaidAndPendingProcessing({
      orderId: updated.orderId,
      invoiceId: updated.invoiceId.toString(),
      paymentMethod: updated.paymentMethod,
      amount: updated.amount,
      transactionId: updated.transactionId || callback.transactionid,
      transactionContent: updated.transactionContent,
      transactionDateTime: updated.transactionDateTime,
    });

    return {
      status: this.vietqrService.mapCallbackToTransactionStatus(callback),
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
