import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  VIETQR_CLIENT,
  VietqrClient,
  VietqrGenerateQRCodeRequest,
} from './clients/vietqr.client';
import { VietqrQrRequestBuilder } from './builders/vietqr-qr-request.builder';
import { QRCodeDataDto } from './dto/qr-code-data.dto';
import { VietqrRequestDto } from './dto/vietqr-request.dto';
import { VietqrTokenService } from './vietqr-token.service';

@Injectable()
export class VietqrService {
  constructor(
    @Inject(VIETQR_CLIENT)
    private readonly vietqrClient: VietqrClient,
    private readonly tokenService: VietqrTokenService,
    private readonly qrRequestBuilder: VietqrQrRequestBuilder,
  ) {}

  getAccessToken(): Promise<string> {
    return this.tokenService.getAccessToken();
  }

  getCachedAccessToken(): string | undefined {
    return this.tokenService.getCachedAccessToken();
  }

  async generateQrCode(request: VietqrRequestDto): Promise<QRCodeDataDto> {
    if (request.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const vietqrRequest = this.qrRequestBuilder.build(request);

    try {
      return await this.tokenService.withAccessTokenRetry((accessToken) =>
        this.callGenerateQrCode(accessToken, vietqrRequest),
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('VietQR QR generation failed');
    }
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
}
