import { InvoicePreviewDto } from '../../dto/invoice-preview.dto';
import { OrderSuccessDto } from '../../dto/order-success.dto';

export const ORDER_EVENT_PUBLISHER = 'ORDER_EVENT_PUBLISHER';
export const NOTIFICATION_OBSERVERS = 'NOTIFICATION_OBSERVERS';

export interface OrderConfirmedEvent {
  recipientEmail?: string;
  orderId?: string;
  order: OrderSuccessDto;
  invoice: InvoicePreviewDto;
}

export interface INotificationObserver {
  update(event: OrderConfirmedEvent): Promise<void>;
}

export interface IOrderEventPublisher {
  publish(event: OrderConfirmedEvent): Promise<void>;
}
