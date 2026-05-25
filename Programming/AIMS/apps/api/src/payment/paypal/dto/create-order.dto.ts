import { IsNumber, Min } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only the primitive amount needed by PaypalController and PaypalService.
 * - It does not expose provider responses, persistence entities, or shared state.
 *
 * Cohesion reason:
 * - Its only responsibility is validating the PayPal order creation amount.
 */
export class CreateOrderDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
