import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { CustomerRefundRequestDto } from './dto/customer-refund-request.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentMethod } from './constants/payment.constants';

/**
 * Controller: PaymentController
 *
 * SOLID Review:
 * SRP: Satisfied. The controller exposes payment API routes and delegates business logic.
 * OCP: Satisfied. New endpoints can be added without changing existing handlers.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Each route receives a focused DTO or route parameter.
 * DIP: Satisfied. The controller depends on PaymentService, not lower-level providers.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The controller passes request DTOs to PaymentService and keeps
 *   payment API endpoints together.
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

  @Post('transactions/:transactionId/cancel')
  cancelPendingTransaction(@Param('transactionId') transactionId: string) {
    return this.paymentService.cancelPendingTransaction(transactionId);
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
