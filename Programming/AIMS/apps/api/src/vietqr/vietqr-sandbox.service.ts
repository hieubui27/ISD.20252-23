import {
  BadGatewayException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    private readonly tokenService: VietqrTokenService,
  ) {}

  async testCallback(dto: VietqrTestCallbackDto) {
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
}
