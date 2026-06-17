import { Inject, Injectable } from '@nestjs/common';
import { VAT_RATE } from '../../constants/place-order.constants';
import { CartItemDto } from '../../dto/cart-item.dto';
import { DeliveryInfoDto } from '../../dto/delivery-info.dto';
import {
  InvoiceItemDto,
  InvoicePreviewDto,
} from '../../dto/invoice-preview.dto';
import {
  PersistedOrderDetail,
  ProductSnapshot,
} from '../ports/order-repository.port';
import {
  IShippingFeeCalculator,
  SHIPPING_FEE_CALCULATOR,
} from '../ports/shipping-fee-calculator.port';

/**
 * Builds invoice previews (VAT + shipping). Delegates the shipping fee to the
 * injected Strategy, so it is agnostic of weight-based vs volumetric rules.
 */
@Injectable()
export class InvoiceCalculator {
  constructor(
    @Inject(SHIPPING_FEE_CALCULATOR)
    private readonly shippingCalculator: IShippingFeeCalculator,
  ) {}

  build(
    items: CartItemDto[],
    products: ProductSnapshot[],
    deliveryInfo: DeliveryInfoDto,
  ): InvoicePreviewDto {
    const productsById = new Map<number, ProductSnapshot>(
      products.map((product) => [product.id, product]),
    );

    const invoiceItems: InvoiceItemDto[] = items.map((item) => {
      const product = productsById.get(item.productId)!;
      const price = product.currentPrice;

      return {
        productId: item.productId,
        title: product.title,
        price,
        quantity: item.quantity,
        amount: price * item.quantity,
        weight: this.toKg(product.weightGrams),
      };
    });

    const subtotalBeforeVat = invoiceItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const vatAmount = subtotalBeforeVat * VAT_RATE;
    const subtotalAfterVat = subtotalBeforeVat + vatAmount;

    const breakdown = this.shippingCalculator.calculate({
      province: deliveryInfo.province,
      subtotalBeforeVat,
      items: items.map((item) => {
        const product = productsById.get(item.productId)!;
        return {
          weightKg: this.toKg(product.weightGrams),
          quantity: item.quantity,
        };
      }),
    });
    const deliveryFee = breakdown.finalShippingFee;

    return {
      items: invoiceItems,
      subtotalBeforeVat,
      vatAmount,
      subtotalAfterVat,
      deliveryFee,
      totalAmount: subtotalAfterVat + deliveryFee,
    };
  }

  /** Rebuilds a preview from an already-persisted order (for the confirmation email). */
  buildFromPersistedOrder(order: PersistedOrderDetail): InvoicePreviewDto {
    const items: InvoiceItemDto[] = order.lines.map((line) => ({
      productId: line.productId,
      title: line.title,
      price: line.price,
      quantity: line.quantity,
      amount: line.price * line.quantity,
      weight:
        line.weightGrams !== undefined
          ? this.toKg(line.weightGrams)
          : undefined,
    }));

    const subtotalBeforeVat = order.subtotal;
    const subtotalAfterVat = order.invoice
      ? order.invoice.vatSubtotal
      : subtotalBeforeVat;

    return {
      items,
      subtotalBeforeVat,
      vatAmount: subtotalAfterVat - subtotalBeforeVat,
      subtotalAfterVat,
      deliveryFee: order.deliveryFee,
      totalAmount: order.invoice
        ? order.invoice.totalAmount
        : subtotalAfterVat + order.deliveryFee,
    };
  }

  private toKg(weightGrams: number): number {
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      return 0;
    }

    return weightGrams / 1000;
  }
}
