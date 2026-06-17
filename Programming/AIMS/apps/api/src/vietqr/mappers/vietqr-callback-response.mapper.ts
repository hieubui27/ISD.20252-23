import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../payment/constants/payment.constants';
import { TransactionStatusDto } from '../../payment/dto/transaction-status.dto';
import { TransactionSyncDto } from '../dto/transaction-sync.dto';

export interface VietqrCallbackResponse {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: { reftransactionid: string } | null;
}

@Injectable()
export class VietqrCallbackResponseMapper {
  toTransactionStatus(callback: TransactionSyncDto): TransactionStatusDto {
    return {
      transactionId: callback.transactionid,
      status: PaymentStatus.SUCCESS,
      message: callback.content || 'VietQR transaction callback received',
      paidAmount: callback.amount,
    };
  }

  success(
    refTransactionId: string,
    message = 'Transaction processed successfully',
  ): VietqrCallbackResponse {
    return {
      error: false,
      errorReason: null,
      toastMessage: message,
      object: {
        reftransactionid: refTransactionId,
      },
    };
  }

  error(errorReason: string, message: string): VietqrCallbackResponse {
    return {
      error: true,
      errorReason,
      toastMessage: message,
      object: null,
    };
  }
}
