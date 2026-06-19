import {
  BadRequestException,
  BadGatewayException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
} from '../payment/constants/payment.constants';
import { StalePaymentTransactionCleanupService } from '../payment/stale-payment-transaction-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';
import { VIETQR_CLIENT, VietqrClient } from './clients/vietqr.client';
import { VietqrConfigService } from './config/vietqr-config.service';
import { VietqrTestCallbackDto } from './dto/vietqr-test-callback.dto';
import { VietqrTokenService } from './vietqr-token.service';

@Injectable()
export class VietqrSandboxService {
  constructor(
    @Inject(VIETQR_CLIENT)
    private readonly vietqrClient: VietqrClient,
    private readonly configService: VietqrConfigService,
    private readonly prisma: PrismaService,
    private readonly stalePaymentTransactionCleanup: StalePaymentTransactionCleanupService,
    private readonly tokenService: VietqrTokenService,
  ) {}

  async testCallback(dto: VietqrTestCallbackDto) {
    await this.ensurePendingVietqrTransaction(dto);

    const defaults = this.configService.getTestCallbackDefaults();
    const request = {
      bankAccount: dto.bankAccount || defaults.bankAccount,
      bankCode: dto.bankCode || defaults.bankCode,
      content: dto.content,
      amount: dto.amount,
      transType: dto.transType || defaults.transType,
    };

    try {
      return await this.tokenService.withAccessTokenRetry((accessToken) =>
        this.vietqrClient.testCallback(accessToken, request),
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadGatewayException('VietQR test callback failed');
    }
  }

  private async ensurePendingVietqrTransaction(dto: VietqrTestCallbackDto) {
    await this.stalePaymentTransactionCleanup.expireStaleTransactions();

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        paymentMethod: PaymentMethod.VIETQR,
        amount: dto.amount,
        ...(dto.orderId
          ? { orderId: dto.orderId }
          : { qrContent: dto.content }),
      },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });

    if (!transaction || transaction.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('VietQR payment is no longer pending');
    }
  }
}
