import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsEnum, ValidateNested } from 'class-validator';
import { PaymentMethod } from '../../payment/constants/payment.constants';
import { CartItemDto } from './cart-item.dto';
import { DeliveryInfoDto } from './delivery-info.dto';

/**
 * Composition over inheritance (see ConfirmOrderDto): declares the shared
 * items + deliveryInfo fields directly instead of extending
 * SubmitDeliveryInfoDto, so adding paymentMethod doesn't create a false "is-a".
 */
export class PlaceOrderPaymentRequestDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  deliveryInfo: DeliveryInfoDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.VIETQR;
}
