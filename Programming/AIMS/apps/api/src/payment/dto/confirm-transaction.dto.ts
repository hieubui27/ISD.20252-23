import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../constants/payment.constants';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO contains only primitive transaction confirmation fields consumed by PaymentService.
 * - It does not depend on Prisma records, provider clients, or shared mutable state.
 *
 * Cohesion reason:
 * - All properties validate the data required to confirm a single payment transaction.
 */
export class ConfirmTransactionDto {
  @IsString()
  orderId: string;

  @IsString()
  invoiceId: string;

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
