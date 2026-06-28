import { DeliveryInfoDto } from '../../dto/delivery-info.dto';
import { OrderSuccessDto } from '../../dto/order-success.dto';
import { PersistedOrderDetail } from '../ports/order-repository.port';

export interface OrderSuccessTransaction {
  transactionId: string;
  transactionContent: string;
  transactionDate: Date;
}

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
