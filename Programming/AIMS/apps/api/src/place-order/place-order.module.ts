import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PlaceOrderBeService } from './application/place-order.service';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderDomainModule } from './place-order-domain.module';

@Module({
  imports: [PlaceOrderDomainModule, PaymentModule],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderBeService],
  exports: [PlaceOrderBeService],
})
export class PlaceOrderModule {}
