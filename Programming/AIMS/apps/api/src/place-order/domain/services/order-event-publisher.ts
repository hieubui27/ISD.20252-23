import { Inject, Injectable } from '@nestjs/common';
import {
  INotificationObserver,
  IOrderEventPublisher,
  NOTIFICATION_OBSERVERS,
  OrderConfirmedEvent,
} from '../ports/notification.port';

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
