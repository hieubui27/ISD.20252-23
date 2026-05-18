import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaypalService } from './paypal.service';

@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  async createOrder(@Body() body: { amount: number }) {
    const order = await this.paypalService.createOrder(body.amount);
    return order;
  }

  @Post('capture-payment/:orderId')
  async capturePayment(@Param('orderId') orderId: string) {
    const capture = await this.paypalService.capturePayment(orderId);
    return capture;
  }
}
