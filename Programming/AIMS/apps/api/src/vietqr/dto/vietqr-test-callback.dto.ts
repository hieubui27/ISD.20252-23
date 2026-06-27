import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO: VietqrTestCallbackDto
 *
 * SOLID Review:
 * SRP: Satisfied. It holds data for one sandbox callback request.
 * OCP: Satisfied. Optional bank fields allow default config to be used.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. No production callback fields are mixed into the DTO.
 * DIP: Satisfied. SandboxService receives this DTO instead of raw request bodies.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes primitive sandbox callback data and all fields serve one test flow.
 */
export class VietqrTestCallbackDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsNumber()
  amount!: number;

  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  transType?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}
