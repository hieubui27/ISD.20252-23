import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DeliveryInfoDto {
  @IsString()
  @IsNotEmpty()
  receiverName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  shippingInstructions?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
