import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RequestResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Required email' })
  email: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Required email' })
  email: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Required otp' })
  otp: number;
}

export class NewPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Required email' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Required password' })
  newPassword: string;
}
