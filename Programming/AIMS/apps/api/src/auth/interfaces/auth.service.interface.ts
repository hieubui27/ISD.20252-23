import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { Response } from 'express';

export interface IAuthService {
  login(
    loginDto: LoginDto,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }>;
  logout(): Promise<{ message: string }>;
  refreshToken(
    refreshToken: string,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }>;
}

export const IAuthServiceToken = Symbol('IAuthService');
