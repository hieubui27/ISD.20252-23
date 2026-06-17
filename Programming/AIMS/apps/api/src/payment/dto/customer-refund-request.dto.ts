import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomerRefundRequestDto {
  @IsString()
  orderId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
