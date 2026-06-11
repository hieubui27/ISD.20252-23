import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BcryptHashService } from '../common/hashing/bcrypt-hash.service';
import { IHashServiceToken } from '../common/hashing/hash.service.interface';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [
    {
      provide: IHashServiceToken,
      useClass: BcryptHashService,
    },
  ],
})
export class AdminModule {}
