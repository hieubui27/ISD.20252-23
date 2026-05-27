import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { CreatePaypalOrderDto } from './dto/create-order.dto';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This controller depends only on PaypalService and passes validated DTO or primitive route data.
 * - It does not access Prisma, VietQR services, or shared mutable state.
 *
 * Cohesion reason:
 * - All methods expose PayPal payment endpoints and delegate provider logic to PaypalService.
 */
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  async createOrder(@Body() body: CreatePaypalOrderDto) {
    const order = await this.paypalService.createOrder(body.amount);
    return order;
  }

  @Post('capture-payment/:orderId')
  async capturePayment(@Param('orderId') orderId: string) {
    const capture = await this.paypalService.capturePayment(orderId);
    return capture;
  }
}
