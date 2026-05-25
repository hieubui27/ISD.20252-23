import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { TransactionStatusDto } from '../payment/dto/transaction-status.dto';
import { PaymentStatus } from '../payment/constants/payment.constants';
import {
  VIETQR_CLIENT,
  VietqrClient,
  VietqrGenerateQRCodeRequest,
} from './clients/vietqr.client';
import { QRCodeDataDto } from './dto/qr-code-data.dto';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { VietqrRequestDto } from './dto/vietqr-request.dto';
import { VietqrTestCallbackDto } from './dto/vietqr-test-callback.dto';
import { normalizeVietqrContent } from './helpers/vietqr-normalize.helper';

export interface VietqrCallbackResponse {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: { reftransactionid: string } | null;
}

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service depends on the VietqrClient port and exchanges explicit VietQR DTOs and primitive token values.
 * - It keeps provider HTTP details behind VietqrClient and does not update AIMS orders or payment records directly.
 *
 * Cohesion reason:
 * - All methods handle VietQR-specific behavior: token retrieval, QR request mapping, QR generation, callback response mapping, and sandbox callback testing.
 */
@Injectable()
export class VietqrService {
  private accessToken?: string;
  private accessTokenExpiredAt?: Date;

  constructor(
    @Inject(VIETQR_CLIENT)
    private readonly vietqrClient: VietqrClient,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.isCachedTokenValid()) {
      return this.accessToken;
    }

    const username = process.env.VIETQR_USERNAME;
    const password = process.env.VIETQR_PASSWORD;

    if (!username || !password) {
      throw new UnauthorizedException('VietQR credentials are not configured');
    }

    try {
      const response = await this.vietqrClient.getAccessToken(
        username,
        password,
      );

      if (!response.access_token) {
        this.clearAccessToken();
        throw new UnauthorizedException('VietQR authentication failed');
      }

      const expiresIn = response.expires_in || 300;
      this.accessToken = response.access_token;
      this.accessTokenExpiredAt = new Date(Date.now() + expiresIn * 1000);

      return response.access_token;
    } catch (error) {
      this.clearAccessToken();
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('VietQR authentication failed');
    }
  }

  async generateQrCode(request: VietqrRequestDto): Promise<QRCodeDataDto> {
    if (request.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const accessToken = await this.getAccessToken();
    const vietqrRequest = this.buildGenerateQRCodeRequest(request);

    try {
      return await this.callGenerateQrCode(accessToken, vietqrRequest);
    } catch (error) {
      if (this.isAuthError(error)) {
        this.clearAccessToken();
        const refreshedToken = await this.getAccessToken();
        return this.callGenerateQrCode(refreshedToken, vietqrRequest);
      }

      throw new BadGatewayException('VietQR QR generation failed');
    }
  }

  mapCallbackToTransactionStatus(
    callback: TransactionSyncDto,
  ): TransactionStatusDto {
    return {
      transactionId: callback.transactionid,
      status: PaymentStatus.SUCCESS,
      message: callback.content || 'VietQR transaction callback received',
      paidAmount: callback.amount,
    };
  }

  async testCallback(dto: VietqrTestCallbackDto) {
    // TODO(VIETQR_SANDBOX_TEST_ONLY): This endpoint must remain disabled in production.
    const accessToken = await this.getAccessToken();
    return this.vietqrClient.testCallback(accessToken, {
      bankAccount:
        dto.bankAccount || this.getRequiredEnv('VIETQR_BANK_ACCOUNT'),
      bankCode: dto.bankCode || this.getRequiredEnv('VIETQR_BANK_CODE'),
      content: dto.content,
      amount: dto.amount,
      transType: dto.transType || process.env.VIETQR_TRANS_TYPE || 'C',
    });
  }

  buildCallbackSuccessResponse(
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

  buildCallbackErrorResponse(
    errorReason: string,
    message: string,
  ): VietqrCallbackResponse {
    return {
      error: true,
      errorReason,
      toastMessage: message,
      object: null,
    };
  }

  getCachedAccessToken() {
    return this.accessToken;
  }

  private async callGenerateQrCode(
    accessToken: string,
    request: VietqrGenerateQRCodeRequest,
  ): Promise<QRCodeDataDto> {
    const response = await this.vietqrClient.generateQRCode(
      accessToken,
      request,
    );
    const data = response.data || response;
    const qrCode = data.qrCode || data.qrDataUrl || data.qrLink;

    if (!qrCode) {
      throw new BadGatewayException('VietQR QR generation failed');
    }

    return {
      qrCode,
      qrDataUrl: data.qrDataUrl,
      qrLink: data.qrLink,
      amount: data.amount || request.amount,
      expiredAt: data.expiredAt ? new Date(data.expiredAt) : undefined,
      qrContent: data.content || request.content,
      orderId: data.orderId || request.orderId,
    };
  }

  private buildGenerateQRCodeRequest(
    request: VietqrRequestDto,
  ): VietqrGenerateQRCodeRequest {
    // TODO(VIETQR_API_INTEGRATION): Verify bank fields, QR type, transType, and note mapping against the active VietQR environment.
    return {
      bankCode: this.getRequiredEnv('VIETQR_BANK_CODE'),
      bankAccount: this.getRequiredEnv('VIETQR_BANK_ACCOUNT'),
      userBankName: this.getRequiredEnv('VIETQR_USER_BANK_NAME'),
      content: normalizeVietqrContent(request.description),
      qrType: process.env.VIETQR_QR_TYPE || '0',
      amount: request.amount,
      orderId: request.orderId,
      transType: process.env.VIETQR_TRANS_TYPE || 'C',
      urlLink: request.returnUrl || process.env.VIETQR_RETURN_URL,
      note: request.description,
    };
  }

  private isCachedTokenValid(): boolean {
    if (!this.accessTokenExpiredAt) {
      return false;
    }

    return this.accessTokenExpiredAt.getTime() - Date.now() > 30000;
  }

  private clearAccessToken(): void {
    this.accessToken = undefined;
    this.accessTokenExpiredAt = undefined;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new BadRequestException(`${name} is not configured`);
    }

    return value;
  }

  private isAuthError(error: unknown): boolean {
    const axiosError = error as AxiosError;
    return (
      axiosError?.response?.status === 401 ||
      axiosError?.response?.status === 403
    );
  }
}
