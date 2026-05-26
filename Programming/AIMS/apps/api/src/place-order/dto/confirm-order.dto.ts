import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SubmitDeliveryInfoDto } from './submit-delivery-info.dto';

export class ConfirmOrderDto extends SubmitDeliveryInfoDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsOptional()
  transactionContent?: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
