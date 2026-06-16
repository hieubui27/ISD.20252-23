import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { PaymentService } from '../../payment/payment.service';
import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
  PAYMENT_STATUS_SUCCESS,
  PAYMENT_TRANSACTION_PROVIDER_PLACE_ORDER,
} from '../constants/place-order.constants';
import { ConfirmOrderDto } from '../dto/confirm-order.dto';
import { DeliveryInfoDto } from '../dto/delivery-info.dto';
import { InvoicePreviewDto } from '../dto/invoice-preview.dto';
import { OrderSuccessDto } from '../dto/order-success.dto';
import { PlaceOrderPaymentRequestDto } from '../dto/place-order-payment-request.dto';
import { PlaceOrderPaymentResultDto } from '../dto/place-order-payment-result.dto';
import { PlaceOrderRequestDto } from '../dto/place-order-request.dto';
import { StockCheckResultDto } from '../dto/stock-check-result.dto';
import { SubmitDeliveryInfoDto } from '../dto/submit-delivery-info.dto';
import { InvalidQuantityException } from '../exceptions/invalid-quantity.exception';
import { OrderFactory } from '../domain/factories/order.factory';
import {
  IOrderEventPublisher,
  ORDER_EVENT_PUBLISHER,
} from '../domain/ports/notification.port';
import {
  IOrderRepository,
  ORDER_REPOSITORY,
  PaymentTransactionSnapshot,
} from '../domain/ports/order-repository.port';
import { InvoiceCalculator } from '../domain/services/invoice-calculator.service';
import { OrderValidationService } from '../domain/services/order-validation.service';
import { StockCheckerService } from '../domain/services/stock-checker.service';

/**
 * FACADE / Orchestrator for the place-order use cases.
 *
 * It only coordinates collaborators – validation, stock check, invoice
 * calculation, persistence (repository), notification (observer) – and contains
 * no DB access, no VAT/shipping math, and no email logic of its own.
 *
 * Coupling: Data Coupling (depends on abstractions/DTOs).
 * Cohesion: Functional Cohesion (one job: drive the ordering workflow).
 */
@Injectable()
export class PlaceOrderBeService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly repository: IOrderRepository,
    private readonly validation: OrderValidationService,
    private readonly stockChecker: StockCheckerService,
    private readonly invoiceCalculator: InvoiceCalculator,
    private readonly orderFactory: OrderFactory,
    @Inject(ORDER_EVENT_PUBLISHER)
    private readonly eventPublisher: IOrderEventPublisher,
    @Optional()
    private readonly paymentService?: PaymentService,
  ) {}

  async checkStock(dto: PlaceOrderRequestDto): Promise<StockCheckResultDto> {
    const items = this.validation.normalizeItems(dto.items);
    const products = await this.repository.findProductsByIds(
      items.map((item) => item.productId),
    );

    return this.stockChecker.check(items, products);
  }

  async processDeliveryInfo(
    dto: SubmitDeliveryInfoDto,
  ): Promise<InvoicePreviewDto> {
    this.validation.validateDeliveryInfo(dto.deliveryInfo);

    const items = this.validation.normalizeItems(dto.items);
    const products = await this.repository.findProductsByIds(
      items.map((item) => item.productId),
    );
    this.ensureSufficientStock(items, products);

    return this.invoiceCalculator.build(items, products, dto.deliveryInfo);
  }

  async createPayment(
    dto: PlaceOrderPaymentRequestDto,
  ): Promise<PlaceOrderPaymentResultDto> {
    if (!this.paymentService) {
      throw new BadRequestException('Payment service is not configured');
    }

    this.validation.validateDeliveryInfoForOrder(dto.deliveryInfo);

    const items = this.validation.normalizeItems(dto.items);
    const products = await this.repository.findProductsByIds(
      items.map((item) => item.productId),
    );
    this.ensureSufficientStock(items, products);

    const invoice = this.invoiceCalculator.build(
      items,
      products,
      dto.deliveryInfo,
    );
    const createInput = this.orderFactory.buildCreateOrderInput(
      invoice,
      dto.deliveryInfo,
      ORDER_STATUS_PENDING_PAYMENT,
    );
    const pendingOrder =
      await this.repository.createPendingPaymentOrder(createInput);

    const paymentResult = await this.paymentService.requestPayment({
      orderId: pendingOrder.orderId,
      invoiceId: pendingOrder.invoiceId,
      paymentMethod: dto.paymentMethod,
      amount: pendingOrder.totalAmount,
      customerEmail: this.validation.getRequiredEmail(dto.deliveryInfo),
    });

    return {
      orderId: pendingOrder.orderId,
      invoiceId: pendingOrder.invoiceId,
      totalAmount: pendingOrder.totalAmount,
      paymentMethod: paymentResult.paymentMethod,
      paymentStatus: paymentResult.status,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      paymentTransactionId: paymentResult.transactionId,
      message: paymentResult.message,
    };
  }

  async confirmOrder(dto: ConfirmOrderDto): Promise<OrderSuccessDto> {
    this.validation.validateDeliveryInfoForOrder(dto.deliveryInfo);
    this.validation.validatePaymentInfo(dto);

    const existing =
      await this.repository.findPaymentTransactionByTransactionId(
        dto.transactionId,
      );
    if (existing) {
      return this.buildSuccessFromExistingTransaction(existing);
    }

    const items = this.validation.normalizeItems(dto.items);
    const products = await this.repository.findProductsByIds(
      items.map((item) => item.productId),
    );
    this.ensureSufficientStock(items, products);

    const invoice = this.invoiceCalculator.build(
      items,
      products,
      dto.deliveryInfo,
    );
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();
    const transactionContent = dto.transactionContent || dto.transactionId;

    const createInput = this.orderFactory.buildCreateOrderInput(
      invoice,
      dto.deliveryInfo,
      ORDER_STATUS_PENDING_PROCESSING,
    );
    await this.repository.createConfirmedOrder(createInput, {
      paymentMethod: dto.paymentMethod,
      provider: PAYMENT_TRANSACTION_PROVIDER_PLACE_ORDER,
      amount: Math.round(invoice.totalAmount),
      status: PAYMENT_STATUS_SUCCESS,
      transactionId: dto.transactionId,
      transactionContent,
      transactionDateTime: transactionDate,
    });

    const successDto = this.toOrderSuccessDto(
      dto.deliveryInfo,
      invoice.totalAmount,
      dto.transactionId,
      transactionContent,
      transactionDate,
    );

    await this.eventPublisher.publish({
      recipientEmail: dto.deliveryInfo.email,
      order: successDto,
      invoice,
    });

    return successDto;
  }

  private ensureSufficientStock(
    items: PlaceOrderRequestDto['items'],
    products: Awaited<ReturnType<IOrderRepository['findProductsByIds']>>,
  ): void {
    const stockResult = this.stockChecker.check(items, products);
    if (!stockResult.sufficient) {
      throw new InvalidQuantityException(stockResult.insufficientItems);
    }
  }

  private async buildSuccessFromExistingTransaction(
    transaction: PaymentTransactionSnapshot,
  ): Promise<OrderSuccessDto> {
    const order = await this.repository.findOrderDetailByOrderId(
      transaction.orderId,
    );

    if (!order || !order.invoice) {
      throw new BadRequestException(
        'Existing transaction cannot be mapped to an order.',
      );
    }

    const transactionId = transaction.transactionId ?? '';

    return {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      province: order.province,
      streetAddress: order.streetAddress,
      totalAmount: order.invoice.totalAmount,
      transactionId,
      transactionContent: transaction.transactionContent || transactionId,
      transactionDate: transaction.transactionDateTime || transaction.createdAt,
    };
  }

  private toOrderSuccessDto(
    deliveryInfo: DeliveryInfoDto,
    totalAmount: number,
    transactionId: string,
    transactionContent: string,
    transactionDate: Date,
  ): OrderSuccessDto {
    return {
      customerName: deliveryInfo.receiverName.trim(),
      phoneNumber: deliveryInfo.phoneNumber,
      province: deliveryInfo.province.trim(),
      streetAddress: deliveryInfo.streetAddress.trim(),
      totalAmount,
      transactionId,
      transactionContent,
      transactionDate,
    };
  }
}
