import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const toOptionalString = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value);

const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === '' ? value : Number(value);

/**
 * DTO: TransactionSyncDto
 *
 * SOLID Review:
 * SRP: Satisfied. It models one VietQR transaction-sync callback.
 * OCP: Satisfied. Optional provider fields can be accepted without changing the core flow.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. The DTO contains only callback payload fields.
 * DIP: Satisfied. The callback service receives validated DTO data.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It carries VietQR callback primitives and all fields describe one sync message.
 */
export class TransactionSyncDto {
  @Transform(toOptionalString)
  @IsString()
  bankaccount!: string;

  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  transType!: string;

  @Transform(toOptionalString)
  @IsString()
  content!: string;

  @Transform(toOptionalString)
  @IsString()
  transactionid!: string;

  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  transactiontime!: number;

  @Transform(toOptionalString)
  @IsString()
  referencenumber!: string;

  @Transform(toOptionalString)
  @IsString()
  orderId!: string;

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
