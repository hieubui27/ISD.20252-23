import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import {
  PROVINCE_PLACEHOLDER,
  VIETNAM_PROVINCES,
} from '../constants/vietnam-provinces';
import {
  InvoicePreview,
  PlaceOrderDeliveryInfo,
} from '../models/place-order.models';
import {
  CheckoutDraft,
  CheckoutDraftService,
} from '../services/checkout-draft.service';
import { PlaceOrderApiService } from '../services/place-order-api.service';
import { AimsFooterComponent } from '../../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../../shared/layout/aims-header/aims-header';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { StatusMessageComponent } from '../../shared/ui/status-message/status-message';
import {
  DeliveryInfoField,
  deliveryInfoFieldError,
  notBlankValidator,
  phoneNumberValidator,
  provinceValidator,
  receiverNameLettersOnlyValidator,
  SHIPPING_INSTRUCTIONS_MAX_LENGTH,
} from '../validators/delivery-info.validators';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AimsButtonComponent,
    AimsFooterComponent,
    AimsHeaderComponent,
    StatusMessageComponent,
  ],
  templateUrl: './delivery.html',
  styleUrl: './delivery.scss',
})
/**
 * SOLID review:
 * - SRP: Medium risk. The component is mostly a page component, but it owns form
 *   setup, validation messages, draft persistence, invoice preview loading, VietQR
 *   payment creation, navigation, and price formatting.
 * - OCP: Partial violation. Adding a new payment method or delivery preview flow
 *   requires modifying this component because VietQR is called directly here.
 * - DIP: Medium risk. The component depends directly on VietQrPaymentFlowService
 *   and PlaceOrderApiService instead of page-level use-case abstractions.
 * - Improvement: Extract DeliveryFormFacade and PlaceOrderCheckoutFacade. Let the
 *   component bind UI state and delegate payment/preview workflows to facades.
 */
export class DeliveryComponent implements OnInit, OnDestroy {
  readonly provinces = VIETNAM_PROVINCES;

  readonly form = inject(FormBuilder).nonNullable.group({
    receiverName: [
      '',
      [
        Validators.required,
        receiverNameLettersOnlyValidator(),
      ],
    ],
    phoneNumber: [
      '',
      [Validators.required, phoneNumberValidator()],
    ],
    email: ['', [Validators.required, Validators.email]],
    streetAddress: ['', [Validators.required, notBlankValidator()]],
    province: [
      PROVINCE_PLACEHOLDER,
      [Validators.required, provinceValidator()],
    ],
    postalCode: [''],
    shippingInstructions: [
      '',
      [Validators.maxLength(SHIPPING_INSTRUCTIONS_MAX_LENGTH)],
    ],
  });

  invoicePreview: InvoicePreview | null = null;
  errorMessage = '';
  statusMessage = '';
  isLoadingPreview = false;
  isCreatingPayment = false;
  submitted = false;

  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private valueChangesSubscription?: Subscription;
  private draft: CheckoutDraft | null = null;

  ngOnInit(): void {
    this.draft = this.checkoutDraftService.get();

    if (!this.checkoutDraftService.hasValidItems(this.draft)) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/product-catalog']);
      return;
    }

    this.form.patchValue({
      receiverName: this.draft.deliveryInfo.receiverName || '',
      phoneNumber: this.draft.deliveryInfo.phoneNumber || '',
      email: this.draft.deliveryInfo.email || '',
      streetAddress:
        this.draft.deliveryInfo.streetAddress || '',
      province:
        this.draft.deliveryInfo.province ||
        PROVINCE_PLACEHOLDER,
      shippingInstructions: this.draft.deliveryInfo.shippingInstructions || '',
    });

    this.loadInvoicePreview();
    this.valueChangesSubscription = this.form.valueChanges
      .pipe(
        debounceTime(250),
        filter(() => this.canPreview),
        distinctUntilChanged(
          (previous, current) =>
            JSON.stringify(previous) === JSON.stringify(current),
        ),
      )
      .subscribe(() => this.loadInvoicePreview());
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  get cartItemCount(): number {
    return this.draftItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get draftItems() {
    return this.draft?.items ?? [];
  }

  get subtotal(): number {
    return this.draftItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
  }

  get vatAmount(): number {
    return this.invoicePreview?.vatAmount ?? Math.round(this.subtotal * 0.1);
  }

  get shippingFee(): number {
    return this.invoicePreview?.deliveryFee ?? 0;
  }

  get totalAmount(): number {
    return this.invoicePreview?.totalAmount ?? this.subtotal + this.vatAmount;
  }

  get canPreview(): boolean {
    return Boolean(
      this.draft &&
        this.form.controls.receiverName.valid &&
        this.form.controls.phoneNumber.valid &&
        this.form.controls.email.valid &&
        this.form.controls.streetAddress.valid &&
        this.form.controls.province.valid,
    );
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.statusMessage = '';

    if (!this.draft) {
      this.router.navigate(['/product-catalog']);
      return;
    }

    if (!this.canPreview || this.form.invalid) {
      this.errorMessage = 'Please complete valid delivery information.';
      return;
    }

    const updatedDraft: CheckoutDraft = {
      ...this.draft,
      deliveryInfo: this.buildDeliveryInfo(),
    };
    this.checkoutDraftService.save(updatedDraft);
    this.draft = updatedDraft;
    this.isCreatingPayment = true;

    this.vietQrPaymentFlow
      .start({
        items: this.checkoutDraftService.toPlaceOrderItems(updatedDraft),
        deliveryInfo: updatedDraft.deliveryInfo,
      })
      .subscribe({
        next: (snapshot) => {
          this.isCreatingPayment = false;

          if (!snapshot.payment.qrCode && !snapshot.latestTransaction?.qrCode) {
            this.errorMessage = 'Unable to create VietQR code.';
            this.cdr.detectChanges();
            return;
          }

          this.router.navigate(['/payment']);
        },
        error: (err) => {
          this.isCreatingPayment = false;
          console.error('Create VietQR payment failed:', err);
          this.errorMessage =
            this.buildStockShortageMessage(err) ||
            err.error?.message ||
            err.message ||
            'Unable to create VietQR payment request.';
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Builds a customer-friendly out-of-stock notice from the backend
   * InvalidQuantityException payload ({ insufficientItems: [...] }).
   * Returns null when the error is unrelated to stock.
   */
  private buildStockShortageMessage(err: unknown): string | null {
    const insufficientItems = (
      err as { error?: { insufficientItems?: unknown } } | null
    )?.error?.insufficientItems;

    if (!Array.isArray(insufficientItems) || insufficientItems.length === 0) {
      return null;
    }

    const titlesById = new Map<number, string>(
      (this.draft?.items ?? []).map((item) => [item.productId, item.title]),
    );

    const details = insufficientItems
      .map((raw) => {
        const item = raw as {
          productId?: number;
          requested?: number;
          available?: number;
        };
        const title =
          titlesById.get(Number(item.productId)) ??
          `Product #${item.productId}`;
        const available = Number(item.available) || 0;

        if (available <= 0) {
          return `"${title}" is out of stock`;
        }

        return `"${title}" only has ${available} left (you requested ${item.requested})`;
      })
      .join('; ');

    return `Some items are no longer available: ${details}. Please reduce the quantity or remove them from your cart.`;
  }

  backToProducts(): void {
    this.router.navigate(['/product-catalog']);
  }

  formatPrice(value: number): string {
    return `${Math.round(value).toLocaleString('vi-VN')} VND`;
  }

  shouldShowError(controlName: DeliveryInfoField): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (this.submitted || control.dirty || control.touched);
  }

  fieldError(controlName: DeliveryInfoField): string {
    const control = this.form.controls[controlName];
    return deliveryInfoFieldError(controlName, control.errors);
  }

  private loadInvoicePreview(): void {
    if (!this.draft || !this.canPreview) return;

    this.isLoadingPreview = true;
    this.placeOrderApi
      .previewInvoice({
        items: this.checkoutDraftService.toPlaceOrderItems(this.draft),
        deliveryInfo: this.buildDeliveryInfo(),
      })
      .subscribe({
        next: (preview) => {
          this.invoicePreview = preview;
          this.isLoadingPreview = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoadingPreview = false;
          console.error('Load invoice preview failed:', err);
          this.errorMessage =
            this.buildStockShortageMessage(err) ||
            err.error?.message ||
            err.message ||
            'Unable to calculate delivery fee.';
          this.cdr.detectChanges();
        },
      });
  }

  private buildDeliveryInfo(): PlaceOrderDeliveryInfo {
    const value = this.form.getRawValue();

    return {
      receiverName: value.receiverName.trim(),
      phoneNumber: value.phoneNumber.trim(),
      email: value.email.trim(),
      province: value.province.trim(),
      streetAddress: value.streetAddress.trim(),
      shippingInstructions: value.shippingInstructions.trim(),
    };
  }

}
