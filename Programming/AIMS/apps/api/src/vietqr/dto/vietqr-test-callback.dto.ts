import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only primitive sandbox callback test fields used by VietqrService.
 * - It does not access payment records, provider clients, or shared mutable state directly.
 *
 * Cohesion reason:
 * - All properties validate the data needed to request one VietQR sandbox callback test.
 */
export class VietqrTestCallbackDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsNumber()
  amount: number;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  transType?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}
