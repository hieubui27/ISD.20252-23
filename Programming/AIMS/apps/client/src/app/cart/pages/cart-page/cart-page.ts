import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutDraft, CheckoutDraftService } from '../../../place-order/services/checkout-draft.service';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';
import { AimsFooterComponent } from '../../../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../../../shared/layout/aims-header/aims-header';
import { StatusMessageComponent } from '../../../shared/ui/status-message/status-message';
import { CartPreview, CartPreviewItem } from '../../models/cart.models';
import { CartStoreService } from '../../services/cart-store.service';

/**
 * Module: CartPageComponent
 * Use Case: UC-Cart - View Cart / Place Order Entry
 *
 * SOLID Review:
 * SRP: Coordinates cart preview state and checkout navigation; line rendering is
 * kept declarative in the template and state mutations are delegated to CartStoreService.
 * OCP: New browser-side display fields can be added by extending CartStoreService/cart models.
 * LSP: Not applicable. This component does not define inheritance.
 * ISP: Satisfied. It depends only on cart store and checkout draft methods.
 * DIP: Satisfied. Browser persistence is delegated to CartStoreService.
 *
 * Improvement Direction:
 * Keep cart state browser-only here; only the place-order flow should call backend APIs.
 */
@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    AimsFooterComponent,
    AimsHeaderComponent,
    StatusMessageComponent,
  ],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPageComponent {
  private readonly cartStore = inject(CartStoreService);
  private readonly checkoutDraft = inject(CheckoutDraftService);
  private readonly router = inject(Router);

  readonly imageLoadFailures = signal<Set<number>>(new Set());
  readonly cartItems = this.cartStore.items;
  readonly cartCount = this.cartStore.count;
  readonly preview = computed(() => this.buildLocalPreview());
  readonly subtotal = computed(() => this.preview().subtotal);

  private buildLocalPreview(): CartPreview {
    const items: CartPreviewItem[] = this.cartStore.items().map((item) => ({
      productId: item.productId,
      title: item.title,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
      imageUrl: item.imageUrl,
      type: item.type,
    }));

    return {
      items,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  }

  increase(item: CartPreviewItem): void {
    this.cartStore.setQuantity(item.productId, item.quantity + 1);
  }

  decrease(item: CartPreviewItem): void {
    this.cartStore.setQuantity(item.productId, item.quantity - 1);
  }

  remove(item: CartPreviewItem): void {
    this.cartStore.remove(item.productId);
  }

  placeOrder(): void {
    const preview = this.preview();

    if (preview.items.length === 0) {
      return;
    }

    const draft: CheckoutDraft = {
      items: preview.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl,
      })),
      deliveryInfo: {
        receiverName: '',
        phoneNumber: '',
        email: '',
        province: '',
        streetAddress: '',
        shippingInstructions: '',
      },
    };

    this.checkoutDraft.save(draft);
    this.router.navigate(['/delivery']);
  }

  goToCatalog(): void {
    this.router.navigate(['/product-catalog']);
  }

  goToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  formatPrice(value: number): string {
    return `${Math.round(value).toLocaleString('vi-VN')} VND`;
  }

  hasImagePreview(item: CartPreviewItem): boolean {
    const imageUrl = item.imageUrl?.trim();

    return Boolean(
      imageUrl &&
        imageUrl.toUpperCase() !== 'N/A' &&
        !this.imageLoadFailures().has(item.productId),
    );
  }

  markImageFailed(item: CartPreviewItem): void {
    this.imageLoadFailures.update((failures) => {
      const nextFailures = new Set(failures);
      nextFailures.add(item.productId);
      return nextFailures;
    });
  }
}
