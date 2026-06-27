import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../constants/payment.constants';

/**
 * DTO: ConfirmTransactionDto
 *
 * SOLID Review:
 * SRP: Satisfied. It holds the data needed to confirm one transaction.
 * OCP: Satisfied. The payment method field lets the service choose the proper provider.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. No unrelated request fields are included.
 * DIP: Satisfied. The API layer sends simple data to PaymentService.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It carries primitive confirmation data and all fields serve the same API action.
 */
export class ConfirmTransactionDto {
  @IsString()
  orderId!: string;

  @IsString()
  invoiceId!: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  transactionContent?: string;

  @IsDateString()
  @IsOptional()
  transactionDateTime?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;
}
