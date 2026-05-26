import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingFeeService } from '../shared/utils/shipping-fee.service';
import { MailModule } from '../mail/mail.module';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderBeService } from './place-order.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderBeService, ShippingFeeService],
  exports: [PlaceOrderBeService],
})
export class PlaceOrderModule {}
