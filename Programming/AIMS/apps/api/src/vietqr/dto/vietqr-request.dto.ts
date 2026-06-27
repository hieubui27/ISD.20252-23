import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO: VietqrRequestDto
 *
 * SOLID Review:
 * SRP: Satisfied. It describes one VietQR generation request.
 * OCP: Satisfied. Optional order and customer fields can be filled when available.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. The DTO contains only QR generation input fields.
 * DIP: Satisfied. VietqrService receives a DTO instead of controller or database objects.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes primitive request data and all fields are needed for QR creation.
 */
export class VietqrRequestDto {
  @IsString()
  orderId!: string;

  @IsString()
  invoiceId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
