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

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng');
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

    return { message: 'Đăng ký thành công' };
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
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.hashedPass,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const roles = user.roles.map((r) => r.role.roleName);

    const payload = {
      sub: user.id.toString(),
      userName: user.userName,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    this.setCookies(res, accessToken, refreshToken);

    return {
      message: 'Đăng nhập thành công',
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async logout(res: Response): Promise<{ message: string }> {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    // Note: In a real app, you might want to clear the hashedRefreshToken in DB as well,
    // but we need the userId. For simplicity, just clearing cookies.
    return { message: 'Đăng xuất thành công' };
  }

  async refreshToken(
    refreshToken: string,
    res: Response,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Không có refresh token');
    }

    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(payload.sub) },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Token không hợp lệ');
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
      });

      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken },
      });

      this.setCookies(res, newAccessToken, newRefreshToken);

      return {
        message: 'Làm mới token thành công',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
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
}
