import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderFactory } from './domain/factories/order.factory';
import {
  NOTIFICATION_OBSERVERS,
  ORDER_EVENT_PUBLISHER,
} from './domain/ports/notification.port';
import { ORDER_REPOSITORY } from './domain/ports/order-repository.port';
import { SHIPPING_FEE_CALCULATOR } from './domain/ports/shipping-fee-calculator.port';
import { InvoiceCalculator } from './domain/services/invoice-calculator.service';
import { OrderEventPublisher } from './domain/services/order-event-publisher';
import { OrderValidationService } from './domain/services/order-validation.service';
import { StockCheckerService } from './domain/services/stock-checker.service';
import { OrderStateFactory } from './domain/states/order-state.factory';
import {
  DELIVERY_INFO_VALIDATOR,
  DeliveryInfoValidator,
} from './domain/validators/delivery-info.validator';
import { EmailNotificationObserver } from './infrastructure/adapter/email-notification.observer';
import { WeightBasedShippingStrategy } from './infrastructure/adapter/weight-based-shipping.strategy';
import { PrismaOrderRepository } from './infrastructure/repositories/prisma-order.repository';

/**
 * Owns the reusable place-order domain providers (ports + their implementations)
 * and exports the abstractions. Imported by both PlaceOrderModule and
 * PaymentModule, so the payment adapter and the facade share one wiring without
 * a circular module dependency.
 *
 * To switch the active shipping strategy (future requirement #3), change the
 * single `useClass` line below – no consumer code changes (OCP + DIP).
 */
@Module({
  imports: [PrismaModule, MailModule],
  providers: [
    // ── Strategy: shipping fee. Swap implementation here only. ──
    { provide: SHIPPING_FEE_CALCULATOR, useClass: WeightBasedShippingStrategy },

    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    OrderStateFactory,
    InvoiceCalculator,
    OrderValidationService,
    StockCheckerService,
    OrderFactory,

    // ── Rule-based delivery validator (behind DIP token) ──
    {
      provide: DELIVERY_INFO_VALIDATOR,
      useFactory: () => new DeliveryInfoValidator(),
    },

    // ── Observer pattern: register notification channels here ──
    // Add SMS/Zalo/Push by implementing INotificationObserver and appending it.
    EmailNotificationObserver,
    {
      provide: NOTIFICATION_OBSERVERS,
      useFactory: (email: EmailNotificationObserver) => [email],
      inject: [EmailNotificationObserver],
    },
    { provide: ORDER_EVENT_PUBLISHER, useClass: OrderEventPublisher },
  ],
  exports: [
    SHIPPING_FEE_CALCULATOR,
    ORDER_REPOSITORY,
    ORDER_EVENT_PUBLISHER,
    OrderStateFactory,
    InvoiceCalculator,
    OrderValidationService,
    StockCheckerService,
    OrderFactory,
  ],
})
export class PlaceOrderDomainModule {}
