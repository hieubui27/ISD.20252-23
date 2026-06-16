import { Inject, Injectable } from '@nestjs/common';
import {
  INotificationObserver,
  IOrderEventPublisher,
  NOTIFICATION_OBSERVERS,
  OrderConfirmedEvent,
} from '../ports/notification.port';

/**
 * Subject/Publisher of the Observer pattern. Notifies every registered observer
 * and never throws – a failing notification channel must not break the order
 * flow (callers may fire-and-forget).
 */
@Injectable()
export class OrderEventPublisher implements IOrderEventPublisher {
  constructor(
    @Inject(NOTIFICATION_OBSERVERS)
    private readonly observers: INotificationObserver[],
  ) {}

  async publish(event: OrderConfirmedEvent): Promise<void> {
    await Promise.all(
      this.observers.map(async (observer) => {
        try {
          await observer.update(event);
        } catch (error) {
          console.error('Notification observer failed:', error);
        }
      }),
    );
  }
}
