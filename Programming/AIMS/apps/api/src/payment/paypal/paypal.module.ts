import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';

@Module({
  providers: [PaypalService],
  controllers: [PaypalController],
})
export class PaypalModule {}
