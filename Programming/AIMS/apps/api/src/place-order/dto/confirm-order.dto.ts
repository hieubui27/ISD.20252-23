import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SubmitDeliveryInfoDto } from './submit-delivery-info.dto';

/**
 * [LSP VIOLATION] – Liskov Substitution Principle
 * ConfirmOrderDto extends SubmitDeliveryInfoDto purely to reuse the
 * items + deliveryInfo fields, not because it truly IS a
 * SubmitDeliveryInfoDto. The subclass adds mandatory payment fields
 * (transactionId, paymentMethod) that tighten the preconditions beyond
 * what the parent declares.
 *
 * Consequence: code that accepts a SubmitDeliveryInfoDto cannot safely
 * be passed a ConfirmOrderDto without knowing about the extra required
 * fields — substitution breaks the parent's contract.
 *
 * Improvement direction:
 *   Use composition instead of inheritance. ConfirmOrderDto should
 *   directly contain:
 *     items: CartItemDto[]
 *     deliveryInfo: DeliveryInfoDto
 *     transactionId: string
 *     paymentMethod: string
 *   This makes the contract explicit and removes the false "is-a"
 *   relationship between a delivery-info step and an order-confirmation step.
 */
export class ConfirmOrderDto extends SubmitDeliveryInfoDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsOptional()
  transactionContent?: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
