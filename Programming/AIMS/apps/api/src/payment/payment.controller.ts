import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This controller depends only on PaymentService and communicates through validated DTOs and primitive route parameters.
 * - It does not access Prisma records, VietQR internals, provider clients, or shared global state directly.
 *
 * Cohesion reason:
 * - All methods expose payment-related API endpoints and delegate payment business behavior to PaymentService.
 */
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm')
  confirmTransaction(@Body() confirmTransactionDto: ConfirmTransactionDto) {
    return this.paymentService.confirmTransaction(confirmTransactionDto);
  }

  @Get('transactions/order/:orderId')
  getPaymentTransactionByOrderId(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentTransactionByOrderId(orderId);
  }
}
