import { Injectable } from '@nestjs/common';
import { MailService } from '../../../mail/mail.service';
import { getOrderConfirmationEmailTemplate } from '../../../mail/templates/order-confirmation.template';
import {
  INotificationObserver,
  OrderConfirmedEvent,
} from '../../domain/ports/notification.port';

/**
 * Concrete Observer – the e-mail channel. The only place that knows about
 * MailService and the order-confirmation template.
 */
@Injectable()
export class EmailNotificationObserver implements INotificationObserver {
  constructor(private readonly mailService: MailService) {}

  async update(event: OrderConfirmedEvent): Promise<void> {
    if (!event.recipientEmail) {
      return;
    }

    const html = getOrderConfirmationEmailTemplate(event.order, event.invoice);

    await this.mailService.sendMail({
      recipientEmail: [event.recipientEmail],
      subject: `[AIMS] Xác nhận đơn hàng - Giao dịch ${event.order.transactionId}`,
      html,
    });
  }
}
