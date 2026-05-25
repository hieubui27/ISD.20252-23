import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO contains only primitive QR generation request fields used by VietqrService.
 * - It does not expose payment transactions, HTTP client internals, or shared global state.
 *
 * Cohesion reason:
 * - All properties describe the data required to generate one VietQR code.
 */
export class VietqrRequestDto {
  @IsString()
  orderId: string;

  @IsString()
  invoiceId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
