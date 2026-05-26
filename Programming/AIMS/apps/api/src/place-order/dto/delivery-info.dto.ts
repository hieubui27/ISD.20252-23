import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeliveryInfoDto {
  @IsString()
  receiverName: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  province: string;

  @IsString()
  streetAddress: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  shippingInstructions?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
