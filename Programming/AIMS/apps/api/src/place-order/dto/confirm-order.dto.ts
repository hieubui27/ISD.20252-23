import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CartItemDto } from './cart-item.dto';
import { DeliveryInfoDto } from './delivery-info.dto';

/**
 * Uses COMPOSITION (declares items + deliveryInfo directly) instead of
 * extending SubmitDeliveryInfoDto. Confirming an order is not an "is-a"
 * delivery-info step: it adds mandatory payment fields that would tighten the
 * parent's preconditions (LSP). Declaring the shared fields here makes the
 * contract explicit while keeping the exact same request shape.
 */
export class ConfirmOrderDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  deliveryInfo: DeliveryInfoDto;

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
