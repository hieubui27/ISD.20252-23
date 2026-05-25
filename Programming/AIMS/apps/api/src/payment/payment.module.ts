import { Module } from '@nestjs/common';
import { PaypalModule } from './paypal/paypal.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { FakePlaceOrderPaymentAdapter } from './adapters/fake-place-order-payment.adapter';
import { PLACE_ORDER_PAYMENT_PORT } from './ports/place-order-payment.port';
import { VietqrController } from '../vietqr/vietqr.controller';
import { VietqrService } from '../vietqr/vietqr.service';
import { VIETQR_CLIENT } from '../vietqr/clients/vietqr.client';
import { VietqrHttpClient } from '../vietqr/clients/vietqr-http.client';
import { VietqrCallbackAuthGuard } from '../vietqr/guards/vietqr-callback-auth.guard';
import { VietqrInboundController } from '../vietqr/vietqr-inbound.controller';
import { VietqrInboundService } from '../vietqr/vietqr-inbound.service';
import { ConfigService } from '../vietqr/config/vietqr-config.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This module wires controllers, services, and provider tokens through NestJS dependency injection.
 * - It does not contain business logic, database access, or shared mutable payment state.
 *
 * Cohesion reason:
 * - All declarations belong to the payment module boundary for payment, VietQR callback, VietQR client, and temporary PlaceOrder integration.
 */
@Module({
  imports: [PaypalModule],
  controllers: [PaymentController, VietqrController, VietqrInboundController],
  providers: [
    PaymentService,
    VietqrService,
    VietqrInboundService,
    ConfigService,
    VietqrCallbackAuthGuard,
    {
      provide: VIETQR_CLIENT,
      useClass: VietqrHttpClient,
    },
    {
      provide: PLACE_ORDER_PAYMENT_PORT,
      useClass: FakePlaceOrderPaymentAdapter,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
