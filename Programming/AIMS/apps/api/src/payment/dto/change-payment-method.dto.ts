import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../constants/payment.constants';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO exposes only primitive payment method change fields consumed by PaymentController and PaymentService.
 * - It has no dependency on database entities, VietQR internals, or shared mutable state.
 *
 * Cohesion reason:
 * - All properties describe and validate the data required to switch a payment transaction from one method to another.
 */
export class ChangePaymentMethodDto {
  @IsString()
  orderId: string;

  @IsString()
  invoiceId: string;

  @IsEnum(PaymentMethod)
  fromMethod: PaymentMethod;

  @IsEnum(PaymentMethod)
  toMethod: PaymentMethod;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}
