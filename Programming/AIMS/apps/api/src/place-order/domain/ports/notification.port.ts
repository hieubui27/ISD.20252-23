import { InvoicePreviewDto } from '../../dto/invoice-preview.dto';
import { OrderSuccessDto } from '../../dto/order-success.dto';

/**
 * Observer pattern – decouples "an order was confirmed" from "how customers are
 * notified". The publisher (subject) knows nothing about concrete channels;
 * each channel implements INotificationObserver.
 *
 * Future requirement #5 (SMS / Zalo / Push) = add a new observer (OCP), the
 * publisher and callers stay untouched.
 */
export const ORDER_EVENT_PUBLISHER = 'ORDER_EVENT_PUBLISHER';
export const NOTIFICATION_OBSERVERS = 'NOTIFICATION_OBSERVERS';

export interface OrderConfirmedEvent {
  recipientEmail?: string;
  order: OrderSuccessDto;
  invoice: InvoicePreviewDto;
}

export interface INotificationObserver {
  update(event: OrderConfirmedEvent): Promise<void>;
}

export interface IOrderEventPublisher {
  publish(event: OrderConfirmedEvent): Promise<void>;
}
