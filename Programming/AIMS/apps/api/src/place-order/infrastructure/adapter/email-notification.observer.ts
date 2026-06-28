import { Injectable } from '@nestjs/common';
import { MailService } from '../../../mail/mail.service';
import { getOrderConfirmationEmailTemplate } from '../../../mail/templates/order-confirmation.template';
import {
  INotificationObserver,
  OrderConfirmedEvent,
} from '../../domain/ports/notification.port';

@Injectable()
export class EmailNotificationObserver implements INotificationObserver {
  constructor(private readonly mailService: MailService) {}

  async update(event: OrderConfirmedEvent): Promise<void> {
    if (!event.recipientEmail) {
      return;
    }
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
    const cancelUrl = event.orderId
      ? `${clientUrl}/cancel-order?orderId=${encodeURIComponent(event.orderId)}`
      : undefined;

    const html = getOrderConfirmationEmailTemplate(
      event.order,
      event.invoice,
      cancelUrl,
    );

    await this.mailService.sendMail({
      recipientEmail: [event.recipientEmail],
      subject: `[AIMS] Xác nhận đơn hàng - Giao dịch ${event.order.transactionId}`,
      html,
    });
  }
}
