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
import { CartItemDto } from '../dto/cart-item.dto';
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
import { OrderSuccessMapper } from '../domain/factories/order-success.mapper';
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

    return this.priceOrder(dto.items, dto.deliveryInfo);
  }

  async createPayment(
    dto: PlaceOrderPaymentRequestDto,
  ): Promise<PlaceOrderPaymentResultDto> {
    if (!this.paymentService) {
      throw new BadRequestException('Payment service is not configured');
    }

    this.validation.validateDeliveryInfoForOrder(dto.deliveryInfo);

    const invoice = await this.priceOrder(dto.items, dto.deliveryInfo);
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

    const invoice = await this.priceOrder(dto.items, dto.deliveryInfo);
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

    const successDto = OrderSuccessMapper.fromDeliveryInfo(
      dto.deliveryInfo,
      invoice.totalAmount,
      {
        transactionId: dto.transactionId,
        transactionContent,
        transactionDate,
      },
    );

    await this.eventPublisher.publish({
      recipientEmail: dto.deliveryInfo.email,
      orderId: createInput.orderCode,
      order: successDto,
      invoice,
    });

    return successDto;
  }

  private async priceOrder(
    items: CartItemDto[],
    deliveryInfo: DeliveryInfoDto,
  ): Promise<InvoicePreviewDto> {
    const normalizedItems = this.validation.normalizeItems(items);
    const products = await this.repository.findProductsByIds(
      normalizedItems.map((item) => item.productId),
    );
    this.ensureSufficientStock(normalizedItems, products);

    return this.invoiceCalculator.build(
      normalizedItems,
      products,
      deliveryInfo,
    );
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

    return OrderSuccessMapper.fromPersistedOrder(
      order,
      order.invoice.totalAmount,
      {
        transactionId,
        transactionContent: transaction.transactionContent || transactionId,
        transactionDate:
          transaction.transactionDateTime || transaction.createdAt,
      },
    );
  }
}
