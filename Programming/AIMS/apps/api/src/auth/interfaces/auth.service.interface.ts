import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from '../dto/forgot-password.dto';
import { Response } from 'express';

export interface IAuthService {
  login(
    loginDto: LoginDto,
    res: Response,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }>;
  createUser(createUserDto: CreateUserDto): Promise<{ message: string }>;
  logout(res: Response): Promise<{ message: string }>;
  refreshToken(
    refreshToken: string,
    res: Response,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }>;
  requestResetPassword(
    dto: RequestResetPasswordDto,
  ): Promise<{ message: string }>;
  verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; token: string }>;
  resetPassword(
    dto: NewPasswordDto,
    verifyOtpToken: string,
  ): Promise<{ message: string }>;
}

export const IAuthServiceToken = Symbol('IAuthService');
