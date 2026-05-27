import { IsString } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only the primitive PayPal order ID needed for payment capture.
 * - It does not depend on provider clients, database entities, or shared mutable state.
 *
 * Cohesion reason:
 * - Its only responsibility is validating the PayPal order identifier for capture.
 */
export class CapturePaypalPaymentDto {
  @IsString()
  orderId: string;
}
