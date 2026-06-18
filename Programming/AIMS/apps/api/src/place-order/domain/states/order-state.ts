import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../../constants/place-order.constants';
import { IllegalOrderTransitionError } from '../errors/illegal-order-transition.error';

/**
 * State pattern – encapsulates the order status transition that the current
 * place-order flow performs, replacing the scattered `if (status === ...)`
 * guards that used to live in the payment adapter.
 *
 * Only the existing transition (PENDING_PAYMENT -> PENDING_PROCESSING on a
 * successful payment, idempotent when already processing) is modelled. Future
 * transitions (approve / reject / cancel) can be added later as new state
 * classes without touching existing logic (OCP) – they are intentionally NOT
 * implemented here because they are not part of the current source code.
 */
export interface StateTransitionResult {
  /** True when the requested transition is a no-op (already in target state). */
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

  // Idempotent: a payment callback fired twice must not decrement stock twice.
  override confirmPayment(): StateTransitionResult {
    return { alreadyInTarget: true };
  }
}
