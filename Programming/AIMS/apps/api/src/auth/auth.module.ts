import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { IAuthServiceToken } from './interfaces/auth.service.interface';
import { MailService } from '../mail/mail.service';
import { MailModule } from '../mail/mail.module';
import { IHashServiceToken } from '../common/hashing/hash.service.interface';
import { BcryptHashService } from '../common/hashing/bcrypt-hash.service';
import { IOtpServiceToken } from './interfaces/otp.service.interface';
import { OtpService } from './services/otp.service';
import { IUsersServiceToken } from './interfaces/users.service.interface';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_ACCESS_SECRET') ||
          'super-secret-key-change-me-in-prod',
        // expiresIn is handled in the service directly
      }),
      inject: [ConfigService],
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: IAuthServiceToken,
      useClass: AuthService,
    },
    {
      provide: IHashServiceToken,
      useClass: BcryptHashService,
    },
    {
      provide: IOtpServiceToken,
      useClass: OtpService,
    },
    {
      provide: IUsersServiceToken,
      useClass: UsersService,
    },
    JwtStrategy,
  ],
  exports: [IAuthServiceToken],
})
export class AuthModule {}
