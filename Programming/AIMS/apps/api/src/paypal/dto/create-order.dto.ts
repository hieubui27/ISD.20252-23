import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only primitive order creation fields from the API boundary into PaypalService.
 * - It does not expose provider responses, persistence entities, or shared mutable state.
 *
 * Cohesion reason:
 * - All properties validate the data needed to create one PayPal order.
 */
export class CreatePaypalOrderDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  currencyCode?: string = 'USD';
}
