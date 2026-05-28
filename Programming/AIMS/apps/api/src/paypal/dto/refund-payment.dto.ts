import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only the primitive PayPal capture ID and optional refund details.
 * - It does not depend on payment records, provider clients, or shared mutable state.
 *
 * Cohesion reason:
 * - All properties validate the data required to initiate one PayPal refund request.
 */
export class RefundPaypalPaymentDto {
  @IsString()
  captureId: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
