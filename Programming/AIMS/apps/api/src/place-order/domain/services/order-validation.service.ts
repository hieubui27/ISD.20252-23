import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DELIVERY_INFO_VALIDATOR,
  IDeliveryInfoValidator,
} from '../validators/delivery-info.validator';
import { CartItemDto } from '../../dto/cart-item.dto';
import { ConfirmOrderDto } from '../../dto/confirm-order.dto';
import { DeliveryInfoDto } from '../../dto/delivery-info.dto';
import { InvalidDeliveryInfoException } from '../../exceptions/invalid-delivery-info.exception';
import { PaymentNotSuccessfulException } from '../../exceptions/payment-not-successful.exception';

@Injectable()
export class OrderValidationService {
  constructor(
    @Inject(DELIVERY_INFO_VALIDATOR)
    private readonly deliveryValidator: IDeliveryInfoValidator,
  ) {}

  normalizeItems(items: CartItemDto[]): CartItemDto[] {
    if (!items || items.length === 0) {
      throw new BadRequestException('Items array must not be empty.');
    }

    const mergedItems = new Map<number, CartItemDto>();

    for (const item of items) {
      if (!item.productId) {
        throw new BadRequestException('Product id is required.');
      }

      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new BadRequestException('Product id must be a positive integer.');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Quantity must be a positive integer.');
      }

      const existing = mergedItems.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        mergedItems.set(item.productId, {
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    return Array.from(mergedItems.values());
  }

  validateDeliveryInfo(deliveryInfo: DeliveryInfoDto): void {
    this.assertNoErrors(this.collectDeliveryErrors(deliveryInfo, false));
  }

  validateDeliveryInfoForOrder(deliveryInfo: DeliveryInfoDto): void {
    this.assertNoErrors(this.collectDeliveryErrors(deliveryInfo, true));
  }

  validatePaymentInfo(dto: ConfirmOrderDto): void {
    if (!dto.transactionId || dto.transactionId.trim().length === 0) {
      throw new PaymentNotSuccessfulException(
        'Payment transaction id is missing.',
      );
    }

    if (!dto.paymentMethod || dto.paymentMethod.trim().length === 0) {
      throw new PaymentNotSuccessfulException('Payment method is missing.');
    }
  }

  getRequiredEmail(deliveryInfo: DeliveryInfoDto): string {
    if (!deliveryInfo.email || deliveryInfo.email.trim().length === 0) {
      throw new InvalidDeliveryInfoException([
        'Email is required to create order.',
      ]);
    }

    return deliveryInfo.email.trim();
  }

  private collectDeliveryErrors(
    deliveryInfo: DeliveryInfoDto,
    requireEmail: boolean,
  ): string[] {
    const validationResult = this.deliveryValidator.validate(deliveryInfo);
    const errors = [...validationResult.errors];

    if (
      requireEmail &&
      (!deliveryInfo?.email || deliveryInfo.email.trim().length === 0)
    ) {
      errors.push('Email is required to create order.');
    }

    return errors;
  }

  private assertNoErrors(errors: string[]): void {
    if (errors.length > 0) {
      throw new InvalidDeliveryInfoException(errors);
    }
  }
}
