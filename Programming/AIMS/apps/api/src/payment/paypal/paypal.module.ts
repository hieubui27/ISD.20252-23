import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This module wires PayPal controller and service through NestJS dependency injection.
 * - It does not contain business logic, provider request construction, or shared mutable state.
 *
 * Cohesion reason:
 * - All declarations belong to the PayPal provider boundary inside the payment module.
 */
@Module({
  providers: [PaypalService],
  controllers: [PaypalController],
  exports: [PaypalService],
})
export class PaypalModule {}
