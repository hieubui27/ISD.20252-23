import { Injectable } from '@nestjs/common';
import { UNAVAILABLE_PRODUCT_STATUSES } from '../../constants/place-order.constants';
import { CartItemDto } from '../../dto/cart-item.dto';
import {
  InsufficientItemDto,
  StockCheckResultDto,
} from '../../dto/stock-check-result.dto';
import { ProductSnapshot } from '../ports/order-repository.port';

/**
 * Pure domain logic: given requested items and the products read from storage,
 * decide whether stock is sufficient. No DB, no framework state.
 */
@Injectable()
export class StockCheckerService {
  check(
    items: CartItemDto[],
    products: ProductSnapshot[],
  ): StockCheckResultDto {
    const productsById = new Map<number, ProductSnapshot>(
      products.map((product) => [product.id, product]),
    );
    const insufficientItems: InsufficientItemDto[] = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      const available =
        product && this.isProductAvailable(product) ? product.quantity : 0;

      if (available < item.quantity) {
        insufficientItems.push({
          productId: item.productId,
          requested: item.quantity,
          available,
        });
      }
    }

    return {
      sufficient: insufficientItems.length === 0,
      insufficientItems,
    };
  }

  private isProductAvailable(product: ProductSnapshot): boolean {
    return !UNAVAILABLE_PRODUCT_STATUSES.includes(
      String(product.status).toUpperCase(),
    );
  }
}
