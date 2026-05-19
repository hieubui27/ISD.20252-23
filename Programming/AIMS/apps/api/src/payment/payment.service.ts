import { BadRequestException, Injectable } from '@nestjs/common';

export interface PaidOrderRepository {
  findByOrderId(orderId: string): Promise<{
    orderId: string;
    paymentMethod: string;
    status: string;
  } | null>;
  markRejected(orderId: string, rejectReason: string): Promise<void>;
}

export interface NotificationService {
  notifyProductManagerManualRefund(notification: {
    orderId: string;
    paymentMethod: string;
    rejectReason: string;
  }): Promise<void>;
}

export interface RefundClient {
  refund(orderId: string): Promise<void>;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly orderRepository: PaidOrderRepository,
    private readonly notificationService: NotificationService,
    private readonly refundClient?: RefundClient,
  ) {}

  async rejectPaidVietQROrder(orderId: string, rejectReason: string) {
    const order = await this.orderRepository.findByOrderId(orderId);

    if (
      !order ||
      order.paymentMethod !== 'VIETQR' ||
      order.status !== 'PAID'
    ) {
      throw new BadRequestException('Order is not a paid VietQR order');
    }

    await this.orderRepository.markRejected(orderId, rejectReason);
    await this.notificationService.notifyProductManagerManualRefund({
      orderId,
      paymentMethod: order.paymentMethod,
      rejectReason,
    });

    return {
      status: 'MANUAL_REFUND_REQUIRED',
      orderId,
    };
  }
}
