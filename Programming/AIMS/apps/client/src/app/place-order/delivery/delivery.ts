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
import { VietQrPaymentFlowService } from '../../payment/flows/vietqr-payment-flow.service';
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
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private valueChangesSubscription?: Subscription;
  private draft: CheckoutDraft | null = null;

  ngOnInit(): void {
    this.draft = this.checkoutDraftService.get();

    if (!this.checkoutDraftService.hasValidItems(this.draft)) {
      this.checkoutDraftService.clear();
      this.router.navigate(['/products']);
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
      this.router.navigate(['/products']);
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
            err.error?.message ||
            err.message ||
            'Unable to create VietQR payment request.';
          this.cdr.detectChanges();
        },
      });
  }

  backToProducts(): void {
    this.router.navigate(['/products']);
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
