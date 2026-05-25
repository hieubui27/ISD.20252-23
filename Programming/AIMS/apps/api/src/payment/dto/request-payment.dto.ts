import { IsEmail, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../constants/payment.constants';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only primitive request payment fields from the API boundary into PaymentService.
 * - It does not expose persistence models, VietQR client objects, or global state.
 *
 * Cohesion reason:
 * - All properties describe and validate the data needed to start one payment request.
 */
export class RequestPaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  invoiceId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.VIETQR;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEmail()
  customerEmail: string;
}
