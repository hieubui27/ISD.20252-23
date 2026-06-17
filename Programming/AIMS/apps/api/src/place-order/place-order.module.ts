import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingFeeService } from '../shared/utils/shipping-fee.service';
import { MailModule } from '../mail/mail.module';
import { PaymentModule } from '../payment/payment.module';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderBeService } from './place-order.service';

/**
 * [DIP VIOLATION] – Dependency Inversion Principle
 * ShippingFeeService is registered directly as a concrete class provider.
 * There is no abstraction token (e.g., SHIPPING_FEE_CALCULATOR), so any
 * consumer that wants to swap the shipping strategy must modify both this
 * module and PlaceOrderBeService's constructor — coupling the module
 * configuration to a specific low-level implementation.
 *
 * Improvement direction:
 *   Replace the plain class registration with a token-based provider:
 *     { provide: SHIPPING_FEE_CALCULATOR, useClass: ShippingFeeService }
 *   PlaceOrderBeService injects @Inject(SHIPPING_FEE_CALCULATOR) and
 *   depends only on the IShippingFeeCalculator interface. Swapping to a
 *   VolumetricWeightShippingStrategy only requires changing useClass here.
 */
@Module({
  imports: [PrismaModule, MailModule, PaymentModule],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderBeService, ShippingFeeService], // [DIP] ShippingFeeService registered as concrete, no abstraction token
  exports: [PlaceOrderBeService],
})
export class PlaceOrderModule {}
