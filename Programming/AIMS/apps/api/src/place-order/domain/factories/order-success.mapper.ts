import { DeliveryInfoDto } from '../../dto/delivery-info.dto';
import { OrderSuccessDto } from '../../dto/order-success.dto';
import { PersistedOrderDetail } from '../ports/order-repository.port';

/** The transaction-specific part of an order-success response. */
export interface OrderSuccessTransaction {
  transactionId: string;
  transactionContent: string;
  transactionDate: Date;
}

/**
 * Single source of truth for assembling an OrderSuccessDto. Removes the field
 * mapping that used to be duplicated across the place-order facade (two flows)
 * and the payment adapter.
 *
 * Two entry points because the customer fields come from two different sources:
 *  - fromDeliveryInfo: raw form input (trims user-entered fields).
 *  - fromPersistedOrder: an already-stored order (DB values are normalised).
 */
export class OrderSuccessMapper {
  static fromDeliveryInfo(
    deliveryInfo: DeliveryInfoDto,
    totalAmount: number,
    transaction: OrderSuccessTransaction,
  ): OrderSuccessDto {
    return {
      customerName: deliveryInfo.receiverName.trim(),
      phoneNumber: deliveryInfo.phoneNumber,
      province: deliveryInfo.province.trim(),
      streetAddress: deliveryInfo.streetAddress.trim(),
      totalAmount,
      transactionId: transaction.transactionId,
      transactionContent: transaction.transactionContent,
      transactionDate: transaction.transactionDate,
    };
  }

  static fromPersistedOrder(
    order: PersistedOrderDetail,
    totalAmount: number,
    transaction: OrderSuccessTransaction,
  ): OrderSuccessDto {
    return {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      province: order.province,
      streetAddress: order.streetAddress,
      totalAmount,
      transactionId: transaction.transactionId,
      transactionContent: transaction.transactionContent,
      transactionDate: transaction.transactionDate,
    };
  }
}
