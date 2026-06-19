import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PaypalModule } from '../paypal/paypal.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VietqrModule } from '../vietqr/vietqr.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentCompletionService } from './payment-completion.service';
import { PaymentGatewayTransactionRefResolver } from './payment-gateway-transaction-ref.resolver';
import { PaymentGatewayOrderIdService } from './payment-gateway-order-id.service';
import { StalePaymentTransactionCleanupService } from './stale-payment-transaction-cleanup.service';
import { PaymentTransactionService } from './payment-transaction.service';
import { OrderPaymentCancellationService } from './order-payment-cancellation.service';
import { PLACE_ORDER_PAYMENT_PORT } from './ports/place-order-payment.port';
import { PlaceOrderPaymentAdapter } from '../place-order/infrastructure/adapter/place-order-payment.adapter';
import { PlaceOrderDomainModule } from '../place-order/place-order-domain.module';
import { PAYMENT_GATEWAYS } from './ports/payment-gateway.port';
import { PaypalGatewayAdapter } from './adapters/paypal-gateway.adapter';
import { VietqrGatewayAdapter } from './adapters/vietqr-gateway.adapter';
import { PaymentGatewayFactory } from './strategies/payment-gateway.factory';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This module wires controllers, services, gateway adapters, and provider tokens through NestJS dependency injection.
 * - It does not contain business logic, database access, or shared mutable payment state.
 *
 * Cohesion reason:
 * - All declarations belong to the payment module boundary for payment, gateway adapters, VietQR callback, VietQR client,
 *   and PlaceOrder integration.
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
  imports: [
    PaypalModule,
    PrismaModule,
    MailModule,
    JwtModule.register({}),
    PlaceOrderDomainModule,
    forwardRef(() => VietqrModule),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentCompletionService,
    PaymentGatewayTransactionRefResolver,
    PaymentGatewayOrderIdService,
    StalePaymentTransactionCleanupService,
    PaymentTransactionService,
    OrderPaymentCancellationService,
    {
      provide: PLACE_ORDER_PAYMENT_PORT,
      useClass: PlaceOrderPaymentAdapter,
    },

    // ── Payment Gateway Adapters (Strategy Pattern) ──
    // Mỗi adapter implement PaymentGateway interface cho một phương thức thanh toán.
    // Thêm phương thức mới: tạo adapter → thêm vào danh sách bên dưới.
    PaypalGatewayAdapter,
    VietqrGatewayAdapter,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (
        paypalGateway: PaypalGatewayAdapter,
        vietqrGateway: VietqrGatewayAdapter,
      ) => [paypalGateway, vietqrGateway],
      inject: [PaypalGatewayAdapter, VietqrGatewayAdapter],
    },
    PaymentGatewayFactory,
  ],
  exports: [PaymentService, PaymentCompletionService],
})
export class PaymentModule {}
