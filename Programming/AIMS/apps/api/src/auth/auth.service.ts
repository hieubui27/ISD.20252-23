import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAuthService } from './interfaces/auth.service.interface';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  IHashService,
  IHashServiceToken,
} from '../common/hashing/hash.service.interface';
import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from './dto/forgot-password.dto';

@Injectable()
/**
 * SOLID:
 * S: Single Responsibility Principle:--> violate
 * O: Open/Closed Principle
 * L: Liskov Substitution Principle
 * I: Interface Segregation Principle
 * D: Dependency Inversion Principle
 */
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
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

    const isPasswordValid = await this.hashService.compare(
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
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'refresh-secret-key',
    });

    const hashedRefreshToken = await this.hashService.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return {
      message: 'Login successful',
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async logout(): Promise<{ message: string }> {
    return { message: 'Logout successful' };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret-key',
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

      const isRefreshTokenValid = await this.hashService.compare(
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
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret-key',
      });

      const hashedRefreshToken = await this.hashService.hash(newRefreshToken);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken },
      });

      return {
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
