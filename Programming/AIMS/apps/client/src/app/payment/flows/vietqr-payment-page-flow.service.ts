import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CheckoutDraftService } from '../../place-order/services/checkout-draft.service';
import {
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';
import { OrderResultStorageService } from '../services/order-result-storage.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { readPaymentErrorMessage } from '../services/payment-result.utils';
import { QrImageService } from '../services/qr-image.service';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';
import { VietQrPaymentFlowService } from './vietqr-payment-flow.service';

@Injectable()
export class VietQrPaymentPageFlowService {
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly orderResultStorage = inject(OrderResultStorageService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly qrImage = inject(QrImageService);
  private readonly router = inject(Router);
  private readonly stateStore = inject(PaymentPageStateStore);
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);

  private currentSnapshot: VietQrPaymentSnapshot | null = null;
  private snapshotSubscription?: Subscription;

  resumeCurrentPaymentIfMatchesPendingSession(): boolean {
    const existingSnapshot = this.vietQrPaymentFlow.currentSnapshot;
    const pendingSession = this.pendingPaymentSession.session;
    if (
      existingSnapshot &&
      pendingSession &&
      existingSnapshot.payment.orderId === pendingSession.orderId
    ) {
      this.vietQrPaymentFlow.resume(existingSnapshot);
      this.listenForUpdates();
      this.applySnapshot(existingSnapshot);
      return true;
    }

    if (existingSnapshot) {
      this.vietQrPaymentFlow.clearSnapshot();
    }

    return false;
  }

  start(): void {
    this.prepareStart();

    this.pendingPaymentSession
      .ensure()
      .then(() => this.startWhenSessionIsReady())
      .catch((err) => this.handleStartError(err));
  }

  confirm(): void {
    if (this.stateStore.snapshot.isVietQrSuccess) {
      this.finishSuccessfulPayment();
      return;
    }

    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage: 'Confirming your VietQR payment...',
    });

    try {
      this.vietQrPaymentFlow.confirmCurrentPayment().subscribe({
        next: (snapshot) => this.handleConfirmationSnapshot(snapshot),
        error: (err) => this.handleConfirmError(err),
      });
    } catch (err) {
      this.handleConfirmError(err, 'VietQR payment has not been created yet.');
    }
  }

  resetSelectionState(): void {
    this.vietQrPaymentFlow.stop();
    this.snapshotSubscription?.unsubscribe();
    this.currentSnapshot = null;
  }

  destroy(): void {
    this.snapshotSubscription?.unsubscribe();
    this.vietQrPaymentFlow.stop();
  }

  private prepareStart(): void {
    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage: '',
      qrImageUrl: '',
      isVietQrSuccess: false,
    });
    this.currentSnapshot = null;
    this.snapshotSubscription?.unsubscribe();
    this.listenForUpdates();
  }

  private startWhenSessionIsReady(): void {
    if (this.stateStore.snapshot.selectedMethod !== 'VIETQR') return;

    const paymentToResume =
      this.pendingPaymentSession.consumeVietQrPaymentToResume();

    if (paymentToResume) {
      this.resumePendingPayment(paymentToResume);
      return;
    }

    this.createPayment();
  }

  private resumePendingPayment(
    payment: VietQrPaymentSnapshot['payment'],
  ): void {
    const snapshot: VietQrPaymentSnapshot = { payment };

    this.vietQrPaymentFlow.resume(snapshot);
    this.stateStore.patch({ isLoading: false, statusMessage: '' });
    this.applySnapshot(snapshot);
  }

  private createPayment(): void {
    this.vietQrPaymentFlow.start(this.buildPaymentInput()).subscribe({
      next: (snapshot) => this.handlePaymentSnapshot(snapshot),
      error: (err) => this.handleStartError(err),
    });
  }

  private handlePaymentSnapshot(snapshot: VietQrPaymentSnapshot): void {
    if (this.stateStore.snapshot.selectedMethod !== 'VIETQR') return;

    this.stateStore.patch({ isLoading: false, statusMessage: '' });
    this.applySnapshot(snapshot);
  }

  private handleConfirmationSnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.applySnapshot(snapshot);

    if (snapshot.latestTransaction?.status !== 'SUCCESS') {
      this.stateStore.patch({
        isLoading: false,
        statusMessage:
          'Payment has not been completed yet. Please try again after paying.',
      });
      return;
    }

    this.stateStore.patch({
      isLoading: false,
      statusMessage: 'Payment confirmed successfully! Redirecting...',
      errorMessage: '',
    });
    this.finishSuccessfulPayment(snapshot);
  }

  private finishSuccessfulPayment(snapshot?: VietQrPaymentSnapshot): void {
    this.saveOrderResult(snapshot);
    this.checkoutDraftService.clear();
    this.pendingPaymentSession.clear();
    this.vietQrPaymentFlow.clearSnapshot();
    this.router.navigate(['/order-result']);
  }

  private handleStartError(err: unknown): void {
    console.error('VietQR payment error:', err);
    this.stateStore.patch({
      isLoading: false,
      errorMessage: readPaymentErrorMessage(
        err,
        'Unable to create VietQR payment request.',
      ),
    });
  }

  private handleConfirmError(
    err: unknown,
    fallback = 'Failed to confirm VietQR payment. Please try again.',
  ): void {
    console.error('VietQR confirmation error:', err);
    this.stateStore.patch({
      isLoading: false,
      errorMessage: readPaymentErrorMessage(err, fallback),
      statusMessage: '',
    });
  }

  private saveOrderResult(snapshot?: VietQrPaymentSnapshot): void {
    const successfulSnapshot =
      snapshot ?? this.currentSnapshot ?? this.vietQrPaymentFlow.currentSnapshot;

    if (!successfulSnapshot) return;

    const transaction = successfulSnapshot.latestTransaction;

    this.orderResultStorage.save({
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      transactionId:
        transaction?.transactionId ||
        transaction?.gatewayOrderId ||
        successfulSnapshot.payment.paymentTransactionId ||
        successfulSnapshot.payment.orderId,
      orderId: successfulSnapshot.payment.orderId,
      invoiceId: successfulSnapshot.payment.invoiceId,
      completedAt: transaction?.transactionDateTime || new Date().toISOString(),
    });
  }

  private listenForUpdates(): void {
    this.snapshotSubscription = this.vietQrPaymentFlow.snapshot$.subscribe(
      (snapshot) => {
        if (!snapshot) return;

        this.applySnapshot(snapshot);
        const status = snapshot.latestTransaction?.status;

        if (status === 'FAILED' || status === 'REFUND_REQUIRED') {
          this.stateStore.patch({
            errorMessage: 'Payment could not be completed.',
          });
        }
      },
    );
  }

  private applySnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.currentSnapshot = snapshot;
    this.stateStore.patch({
      isVietQrSuccess: snapshot.latestTransaction?.status === 'SUCCESS',
      statusMessage:
        snapshot.latestTransaction?.status === 'SUCCESS'
          ? ''
          : this.stateStore.snapshot.statusMessage,
    });
    this.updateQrImageUrl();
  }

  private readQrSource(): string {
    return (
      this.currentSnapshot?.latestTransaction?.qrCode ||
      this.currentSnapshot?.payment.qrCode ||
      ''
    );
  }

  private updateQrImageUrl(): void {
    const qrSource = this.readQrSource();

    if (!qrSource) {
      this.stateStore.patch({ qrImageUrl: '' });
      return;
    }

    this.qrImage
      .toDataUrl(qrSource)
      .then((url) => {
        if (this.readQrSource() === qrSource) {
          this.stateStore.patch({ qrImageUrl: url });
        }
      })
      .catch((err) => {
        console.error('Generate QR image failed:', err);
        this.stateStore.patch({ qrImageUrl: '' });
      });
  }

  private buildPaymentInput(): VietQrPaymentInput {
    const session = this.pendingPaymentSession.session;
    if (!session) {
      throw new Error('Pending order is required to create VietQR payment.');
    }

    return {
      existingPayment: session,
    };
  }
}
