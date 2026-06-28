import { Injectable } from '@nestjs/common';
import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../../constants/place-order.constants';
import { IllegalOrderTransitionError } from '../errors/illegal-order-transition.error';
import {
  IOrderState,
  PendingPaymentState,
  PendingProcessingState,
} from './order-state';

@Injectable()
export class OrderStateFactory {
  create(status: string): IOrderState {
    switch (status) {
      case ORDER_STATUS_PENDING_PAYMENT:
        return new PendingPaymentState();
      case ORDER_STATUS_PENDING_PROCESSING:
        return new PendingProcessingState();
      default:
        throw new IllegalOrderTransitionError(
          `Cannot mark order paid from ${status} state`,
        );
    }
  }
}
