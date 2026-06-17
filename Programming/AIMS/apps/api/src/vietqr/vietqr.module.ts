import { forwardRef, Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VIETQR_CLIENT } from './clients/vietqr.client';
import { VietqrHttpClient } from './clients/vietqr-http.client';
import { VietqrQrRequestBuilder } from './builders/vietqr-qr-request.builder';
import { VietqrConfigService } from './config/vietqr-config.service';
import { VietqrCallbackAuthGuard } from './guards/vietqr-callback-auth.guard';
import { VietqrCallbackResponseMapper } from './mappers/vietqr-callback-response.mapper';
import { VietqrCallbackService } from './vietqr-callback.service';
import { VietqrController } from './vietqr.controller';
import { VietqrInboundController } from './vietqr-inbound.controller';
import { VietqrInboundService } from './vietqr-inbound.service';
import { VietqrSandboxService } from './vietqr-sandbox.service';
import { VietqrService } from './vietqr.service';
import { VietqrTokenService } from './vietqr-token.service';

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [VietqrController, VietqrInboundController],
  providers: [
    VietqrService,
    VietqrCallbackService,
    VietqrInboundService,
    VietqrConfigService,
    VietqrTokenService,
    VietqrSandboxService,
    VietqrQrRequestBuilder,
    VietqrCallbackResponseMapper,
    VietqrCallbackAuthGuard,
    {
      provide: VIETQR_CLIENT,
      useClass: VietqrHttpClient,
    },
  ],
  exports: [
    VietqrService,
    VietqrConfigService,
    VietqrSandboxService,
    VietqrCallbackResponseMapper,
    VietqrCallbackAuthGuard,
  ],
})
export class VietqrModule {}
