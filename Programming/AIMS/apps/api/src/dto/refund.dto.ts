import { IsString } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only the primitive PayPal capture ID needed for refund.
 * - It does not depend on payment records, provider clients, or shared mutable state.
 *
 * Cohesion reason:
 * - Its only responsibility is validating the PayPal refund identifier.
 */
export class RefundDto {
  @IsString()
  captureId: string;
}
