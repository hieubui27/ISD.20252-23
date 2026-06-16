import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PlaceOrderBeService } from './application/place-order.service';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderDomainModule } from './place-order-domain.module';

/**
 * Thin composition root for the place-order use cases.
 *
 * - Domain providers (repository, strategies, states, observer, services) come
 *   from PlaceOrderDomainModule.
 * - PaymentService comes from PaymentModule.
 * The facade (PlaceOrderBeService) only orchestrates these injected abstractions.
 */
@Module({
  imports: [PlaceOrderDomainModule, PaymentModule],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderBeService],
  exports: [PlaceOrderBeService],
})
export class PlaceOrderModule {}
