import { IsEmail, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../constants/payment.constants';

/**
 * DTO: RequestPaymentDto
 *
 * SOLID Review:
 * SRP: Satisfied. It describes one request to start a payment.
 * OCP: Satisfied. Optional fields allow supported payment methods to add provider data.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. The DTO contains only fields needed by the request-payment API.
 * DIP: Satisfied. Controllers and services exchange this DTO instead of provider models.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes primitive request data and all fields belong to payment creation.
 */
export class RequestPaymentDto {
  @IsString()
  orderId!: string;

  @IsString()
  invoiceId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.VIETQR;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEmail()
  customerEmail!: string;
}
