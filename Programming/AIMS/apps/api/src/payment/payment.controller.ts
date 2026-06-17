import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { CustomerRefundRequestDto } from './dto/customer-refund-request.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentMethod } from './constants/payment.constants';

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

  @Post('request')
  requestPayment(@Body() requestPaymentDto: RequestPaymentDto) {
    return this.paymentService.requestPayment(requestPaymentDto);
  }

  @Post('confirm')
  confirmTransaction(@Body() confirmTransactionDto: ConfirmTransactionDto) {
    return this.paymentService.confirmTransaction(confirmTransactionDto);
  }

  @Post('refund/request')
  requestCustomerRefund(@Body() dto: CustomerRefundRequestDto) {
    return this.paymentService.requestCustomerRefund(dto);
  }

  @Get('refund/order-info')
  getRefundOrderInfo(@Query('orderId') orderId: string) {
    return this.paymentService.getRefundOrderInfo(orderId);
  }

  @Get('transactions/order/:orderId')
  getPaymentTransactionByOrderId(
    @Param('orderId') orderId: string,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    return this.paymentService.getPaymentTransactionByOrderId(
      orderId,
      paymentMethod,
    );
  }
}
