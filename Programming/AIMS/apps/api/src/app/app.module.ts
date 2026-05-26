import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { PlaceOrderModule } from '../place-order/place-order.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ProductModule,
    PaymentModule,
    AuthModule,
    MailModule,
    PlaceOrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
