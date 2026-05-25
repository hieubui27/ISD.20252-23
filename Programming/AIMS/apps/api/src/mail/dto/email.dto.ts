import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class sendMailDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  recipientEmail: string[];

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsString()
  text?: string;
}

export class SendInvitationDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  recipientEmail: string[];

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  loginLink?: string;
}
