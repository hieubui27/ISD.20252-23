import { Body, Controller, Post } from '@nestjs/common';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { InvoicePreviewDto } from './dto/invoice-preview.dto';
import { OrderSuccessDto } from './dto/order-success.dto';
import { PlaceOrderPaymentRequestDto } from './dto/place-order-payment-request.dto';
import { PlaceOrderPaymentResultDto } from './dto/place-order-payment-result.dto';
import { PlaceOrderRequestDto } from './dto/place-order-request.dto';
import { StockCheckResultDto } from './dto/stock-check-result.dto';
import { SubmitDeliveryInfoDto } from './dto/submit-delivery-info.dto';
import { PlaceOrderBeService } from './place-order.service';

@Controller('place-order')
export class PlaceOrderController {
  constructor(private readonly placeOrderService: PlaceOrderBeService) {}

  @Post('check-stock')
  checkStock(
    @Body() placeOrderRequestDto: PlaceOrderRequestDto,
  ): Promise<StockCheckResultDto> {
    return this.placeOrderService.checkStock(placeOrderRequestDto);
  }

  @Post('delivery-info')
  submitDeliveryInfo(
    @Body() submitDeliveryInfoDto: SubmitDeliveryInfoDto,
  ): Promise<InvoicePreviewDto> {
    return this.placeOrderService.processDeliveryInfo(submitDeliveryInfoDto);
  }

  @Post('confirm')
  confirmOrder(
    @Body() confirmOrderDto: ConfirmOrderDto,
  ): Promise<OrderSuccessDto> {
    return this.placeOrderService.confirmOrder(confirmOrderDto);
  }

  @Post('payment')
  createPayment(
    @Body() placeOrderPaymentRequestDto: PlaceOrderPaymentRequestDto,
  ): Promise<PlaceOrderPaymentResultDto> {
    return this.placeOrderService.createPayment(placeOrderPaymentRequestDto);
  }
}
