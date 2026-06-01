import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { IAuthService } from './interfaces/auth.service.interface';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from './dto/forgot-password.dto';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const hashedPass = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        userName: createUserDto.userName,
        email: createUserDto.email,
        hashedPass: hashedPass,
        status: 'ACTIVE',
      },
    });

    if (createUserDto.roleNames && createUserDto.roleNames.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: { roleName: { in: createUserDto.roleNames } },
      });

      if (roles.length > 0) {
        await this.prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId: user.id,
            roleId: role.id,
          })),
        });
      }
    }
    const loginLink = `${process.env.WEB_URL}/login`;
    await this.mailService.sendInvitation({
      recipientEmail: [createUserDto.email],
      username: createUserDto.userName,
      password: createUserDto.password,
      loginLink,
    });

    return { message: 'Registration successful' };
  }

  async login(
    loginDto: LoginDto,
    res: Response,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.hashedPass,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been locked');
    }

    const roles = user.roles.map((r) => r.role.roleName);

    const payload = {
      sub: user.id.toString(),
      userName: user.userName,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    this.setCookies(res, accessToken, refreshToken);

    return {
      message: 'Login successful',
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async logout(res: Response): Promise<{ message: string }> {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    // Note: In a real app, you might want to clear the hashedRefreshToken in DB as well,
    // but we need the userId. For simplicity, just clearing cookies.
    return { message: 'Logout successful' };
  }

  async refreshToken(
    refreshToken: string,
    res: Response,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(payload.sub) },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Invalid token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid token');
      }

      const roles = user.roles.map((r) => r.role.roleName);
      const newPayload = {
        sub: user.id.toString(),
        userName: user.userName,
        email: user.email,
        roles,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken },
      });

      this.setCookies(res, newAccessToken, newRefreshToken);

      return {
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

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
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key',
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
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key',
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
      const hashedPass = await bcrypt.hash(dto.newPassword, 10);
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
