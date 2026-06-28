import { Injectable } from '@nestjs/common';
import { DELIVERY_METHOD_STANDARD } from '../../constants/place-order.constants';
import { DeliveryInfoDto } from '../../dto/delivery-info.dto';
import { InvoicePreviewDto } from '../../dto/invoice-preview.dto';
import { CreateOrderInput } from '../ports/order-repository.port';

@Injectable()
export class OrderFactory {
  buildCreateOrderInput(
    invoice: InvoicePreviewDto,
    deliveryInfo: DeliveryInfoDto,
    status: string,
  ): CreateOrderInput {
    return {
      orderCode: this.generateOrderCode(),
      customerName: deliveryInfo.receiverName.trim(),
      phoneNumber: deliveryInfo.phoneNumber,
      email: (deliveryInfo.email ?? '').trim(),
      streetAddress: deliveryInfo.streetAddress.trim(),
      province: deliveryInfo.province.trim(),
      deliveryMethod: DELIVERY_METHOD_STANDARD,
      deliveryFee: invoice.deliveryFee,
      subtotal: invoice.subtotalBeforeVat,
      vatSubtotal: invoice.subtotalAfterVat,
      totalAmount: invoice.totalAmount,
      status,
      lines: invoice.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  }

  private generateOrderCode(): string {
    return `PO-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}
