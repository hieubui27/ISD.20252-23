import { Module } from '@nestjs/common';
import { OrderManagerController } from './order-manager.controller';
import { OrderManagerService } from './order-manager.service';
import { ORDER_MANAGER_SERVICE } from './interfaces/order-manager.service.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, MailModule, PaymentModule, AuthModule],
  controllers: [OrderManagerController],
  providers: [
    OrderManagerService,
    {
      provide: ORDER_MANAGER_SERVICE,
      useExisting: OrderManagerService,
    },
  ],
  exports: [ORDER_MANAGER_SERVICE],
})
export class OrderManagerModule {}
