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
 * Module: PaymentModule
 *
 * SOLID Review:
 * SRP: Satisfied. This module wires payment controllers, services, adapters, and ports.
 * OCP: Satisfied. New payment gateways can be added by registering another adapter.
 * LSP: Satisfied. Gateway adapters are used through the same contracts.
 * ISP: Satisfied. Other modules receive only the exported payment services.
 * DIP: Satisfied. PaymentService works with gateway and place-order abstractions.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The module passes dependencies through NestJS DI and keeps payment
 *   providers inside the payment boundary.
 */
@Module({
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

    // Payment gateway adapters registered for the strategy factory.
    // Add a new adapter here when another payment method is supported.
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
  exports: [
    PaymentService,
    PaymentCompletionService,
    StalePaymentTransactionCleanupService,
  ],
})
export class PaymentModule {}
