import { Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateNested } from 'class-validator';
import { CartItemDto } from './cart-item.dto';
import { DeliveryInfoDto } from './delivery-info.dto';

export class SubmitDeliveryInfoDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  deliveryInfo: DeliveryInfoDto;
}
