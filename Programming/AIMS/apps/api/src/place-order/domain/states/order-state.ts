import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../../constants/place-order.constants';
import { IllegalOrderTransitionError } from '../errors/illegal-order-transition.error';

export interface StateTransitionResult {
  alreadyInTarget: boolean;
}

export interface IOrderState {
  confirmPayment(): StateTransitionResult;
}

abstract class BaseOrderState implements IOrderState {
  abstract getStatus(): string;

  confirmPayment(): StateTransitionResult {
    throw new IllegalOrderTransitionError(
      `Cannot mark order paid from ${this.getStatus()} state`,
    );
  }
}

export class PendingPaymentState extends BaseOrderState {
  getStatus(): string {
    return ORDER_STATUS_PENDING_PAYMENT;
  }

  override confirmPayment(): StateTransitionResult {
    return { alreadyInTarget: false };
  }
}

export class PendingProcessingState extends BaseOrderState {
  getStatus(): string {
    return ORDER_STATUS_PENDING_PROCESSING;
  }

  override confirmPayment(): StateTransitionResult {
    return { alreadyInTarget: true };
  }
}
