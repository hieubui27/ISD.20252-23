import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingFeeService } from '../order/shipping-fee.service';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderBeService } from './place-order.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderBeService, ShippingFeeService],
  exports: [PlaceOrderBeService],
})
export class PlaceOrderModule {}
