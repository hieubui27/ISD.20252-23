import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { IOtpService } from '../interfaces/otp.service.interface';
import {
  RequestResetPasswordDto,
  VerifyOtpDto,
  NewPasswordDto,
} from '../dto/forgot-password.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import {
  IHashService,
  IHashServiceToken,
} from '../../common/hashing/hash.service.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService implements IOtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
    private readonly configService: ConfigService,
  ) {}

  async requestResetPassword(dto: RequestResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new BadRequestException('User not found');
    try {
      const update = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          otp: Math.floor(100000 + Math.random() * 900000),
          otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      if (!update) throw new BadRequestException("Can't update password");

      await this.mailService.sendOtpCode({
        recipientEmail: [dto.email],
        otp: update.otp.toString(),
        expirationTime: update.otpExpiration.toString(),
        username: user.userName,
      });

      return { message: 'OTP sended' };
    } catch (error) {
      console.log(error);
      return { message: 'Error' };
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new BadRequestException('User not found');
    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiration < new Date())
      throw new BadRequestException('OTP expired');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiration: null },
    });

    const resetToken = this.jwtService.sign(
      { email: user.email, purpose: 'reset_password' },
      {
        expiresIn: '5m',
        secret:
          this.configService.get<string>('JWT_RESET_SECRET') ||
          'reset-secret-key',
      },
    );

    return {
      message: 'OTP verified',
      token: resetToken,
    };
  }

  async resetPassword(
    dto: NewPasswordDto,
    verifyOtpToken: string,
  ): Promise<{ message: string }> {
    if (!verifyOtpToken) {
      throw new UnauthorizedException('Missing reset token');
    }

    try {
      const payload = this.jwtService.verify(verifyOtpToken, {
        secret:
          this.configService.get<string>('JWT_RESET_SECRET') ||
          'reset-secret-key',
      });
      if (payload.purpose !== 'reset_password' || payload.email !== dto.email) {
        throw new UnauthorizedException('Invalid reset token');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });
      if (!user) throw new BadRequestException('User not found');
      const hashedPass = await this.hashService.hash(dto.newPassword);
      const update = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          hashedPass: hashedPass,
          otp: null,
          otpExpiration: null,
        },
      });
      if (!update) throw new BadRequestException("Can't update password");
      return { message: 'Password reset successfully' };
    } catch (error) {
      console.log(error);
      return { message: 'Error' };
    }
  }
}
