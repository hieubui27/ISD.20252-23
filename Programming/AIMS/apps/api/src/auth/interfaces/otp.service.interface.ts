import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from '../dto/forgot-password.dto';

export interface IOtpService {
  requestResetPassword(
    dto: RequestResetPasswordDto,
  ): Promise<{ message: string }>;
  verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; token?: string }>;
  resetPassword(
    dto: NewPasswordDto,
    verifyOtpToken: string,
  ): Promise<{ message: string }>;
}

export const IOtpServiceToken = Symbol('IOtpService');
