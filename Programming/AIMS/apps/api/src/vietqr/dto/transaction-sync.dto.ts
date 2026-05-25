import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only VietQR callback payload fields from the controller into PaymentService.
 * - It does not depend on database models, AIMS order services, or HTTP client implementation details.
 *
 * Cohesion reason:
 * - All properties describe and validate one VietQR transaction synchronization callback.
 */
export class TransactionSyncDto {
  @IsString()
  @IsOptional()
  bankaccount?: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  transType: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  transactionid: string;

  @IsString()
  @IsOptional()
  transactiontime?: string;

  @IsString()
  @IsOptional()
  referencenumber?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  terminalCode?: string;

  @IsString()
  @IsOptional()
  subTerminalCode?: string;

  @IsString()
  @IsOptional()
  serviceCode?: string;

  @IsString()
  @IsOptional()
  urlLink?: string;

  @IsString()
  @IsOptional()
  sign?: string;
}
