import { Module } from '@nestjs/common';
import { PaypalModule } from '../paypal/paypal.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PLACE_ORDER_PAYMENT_PORT } from './ports/place-order-payment.port';
import { PlaceOrderPaymentAdapter } from '../place-order/adapters/place-order-payment.adapter';
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
  /*
   * SOLID review:
   * - DIP/OCP: Medium risk. VietQR controllers, services, guards, config, and HTTP
   *   client are registered directly inside PaymentModule. This is acceptable for a
   *   small module, but changing the VietQR implementation or disabling sandbox
   *   endpoints requires editing this payment module.
   * - Improvement: Create a VietqrModule that owns VietQR providers and exports a
   *   narrow provider-facing service/port. PaymentModule should import VietqrModule
   *   and depend on exported abstractions.
   */
  imports: [PaypalModule, PrismaModule, MailModule],
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
      useClass: PlaceOrderPaymentAdapter,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
