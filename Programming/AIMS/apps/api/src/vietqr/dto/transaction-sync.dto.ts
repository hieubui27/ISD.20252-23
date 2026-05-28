import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const toOptionalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === '' ? value : Number(value);

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
  @Transform(toOptionalString)
  @IsString()
  bankaccount: string;

  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  transType: string;

  @Transform(toOptionalString)
  @IsString()
  content: string;

  @Transform(toOptionalString)
  @IsString()
  transactionid: string;

  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  transactiontime: number;

  @Transform(toOptionalString)
  @IsString()
  referencenumber: string;

  @Transform(toOptionalString)
  @IsString()
  orderId: string;

  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  terminalCode?: string;

  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  subTerminalCode?: string;

  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  serviceCode?: string;

  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  urlLink?: string;

  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  sign?: string;
}
