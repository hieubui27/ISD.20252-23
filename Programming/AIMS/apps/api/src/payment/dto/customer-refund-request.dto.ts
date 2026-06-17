import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomerRefundRequestDto {
  @IsString()
  token!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
