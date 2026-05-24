import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { IAuthServiceToken } from './interfaces/auth.service.interface';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-change-me-in-prod',
      // expiresIn is handled in the service directly
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: IAuthServiceToken,
      useClass: AuthService,
    },
    JwtStrategy,
  ],
  exports: [IAuthServiceToken],
})
export class AuthModule {}
