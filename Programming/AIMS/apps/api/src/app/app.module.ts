import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { PlaceOrderModule } from '../place-order/place-order.module';
import { OrderManagerModule } from '../order-manager/order-manager.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProductModule,
    PaymentModule,
    AuthModule,
    MailModule,
    PlaceOrderModule,
    OrderManagerModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
