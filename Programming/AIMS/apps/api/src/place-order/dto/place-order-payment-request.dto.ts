import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../../payment/constants/payment.constants';
import { SubmitDeliveryInfoDto } from './submit-delivery-info.dto';

export class PlaceOrderPaymentRequestDto extends SubmitDeliveryInfoDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.VIETQR;
}
