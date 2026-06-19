import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderResultState } from '../../place-order/order-result/order-result-state';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/payment.constants';
import {
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';
import { PaymentCompletionService } from '../services/payment-completion.service';
import { PendingPaymentSessionService } from '../services/pending-payment-session.service';
import { readPaymentErrorMessage } from '../services/payment-result.utils';
import { QrImageService } from '../services/qr-image.service';
import { PaymentPageStateStore } from '../stores/payment-page-state.store';
import { VietQrPaymentFlowService } from './vietqr-payment-flow.service';

@Injectable()
export class VietQrPaymentPageFlowService {
  private readonly paymentCompletion = inject(PaymentCompletionService);
  private readonly pendingPaymentSession = inject(PendingPaymentSessionService);
  private readonly qrImage = inject(QrImageService);
  private readonly stateStore = inject(PaymentPageStateStore);
  private readonly vietQrPaymentFlow = inject(VietQrPaymentFlowService);

  private currentSnapshot: VietQrPaymentSnapshot | null = null;
  private snapshotSubscription?: Subscription;
  private paymentExpiredHandler?: () => void;
  private isHandlingExpiredPayment = false;

  onPaymentExpired(handler: () => void): void {
    this.paymentExpiredHandler = handler;
  }

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

  start(statusMessage = ''): void {
    this.prepareStart(statusMessage);

    this.pendingPaymentSession
      .ensure()
      .then(() => this.startWhenSessionIsReady())
      .catch((err) => this.handleStartError(err));
  }

  startFresh(statusMessage = ''): void {
    this.resetSelectionState();
    this.vietQrPaymentFlow.clearSnapshot();
    this.start(statusMessage);
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

  private prepareStart(statusMessage = ''): void {
    this.isHandlingExpiredPayment = false;
    this.stateStore.patch({
      isLoading: true,
      errorMessage: '',
      statusMessage,
      qrImageUrl: '',
      isVietQrSuccess: false,
    });
    this.currentSnapshot = null;
    this.snapshotSubscription?.unsubscribe();
    this.listenForUpdates();
  }

  private startWhenSessionIsReady(): void {
    if (this.stateStore.snapshot.selectedMethod !== PAYMENT_METHOD.VIETQR) {
      return;
    }

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
    if (this.stateStore.snapshot.selectedMethod !== PAYMENT_METHOD.VIETQR) {
      return;
    }

    this.stateStore.patch({ isLoading: false, statusMessage: '' });
    this.applySnapshot(snapshot);
  }

  private handleConfirmationSnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.applySnapshot(snapshot);

    if (snapshot.latestTransaction?.status === PAYMENT_STATUS.FAILED) {
      this.handleExpiredPayment();
      return;
    }

    if (snapshot.latestTransaction?.status !== PAYMENT_STATUS.SUCCESS) {
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
    this.paymentCompletion.complete(this.buildOrderResult(snapshot), () =>
      this.vietQrPaymentFlow.clearSnapshot(),
    );
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

  private buildOrderResult(
    snapshot?: VietQrPaymentSnapshot,
  ): OrderResultState | null {
    const successfulSnapshot =
      snapshot ??
      this.currentSnapshot ??
      this.vietQrPaymentFlow.currentSnapshot;

    if (!successfulSnapshot) return null;

    const transaction = successfulSnapshot.latestTransaction;
    const completedAt =
      transaction?.transactionDateTime || new Date().toISOString();

    return {
      paymentMethod: PAYMENT_METHOD.VIETQR,
      status: PAYMENT_STATUS.SUCCESS,
      transactionId:
        transaction?.transactionId ||
        transaction?.gatewayOrderId ||
        successfulSnapshot.payment.paymentTransactionId ||
        successfulSnapshot.payment.orderId,
      orderId: successfulSnapshot.payment.orderId,
      invoiceId: successfulSnapshot.payment.invoiceId,
      completedAt,
      totalAmount: successfulSnapshot.payment.totalAmount ?? 0,
      transactionContent:
        transaction?.transactionContent || 'Purchase of Media Product',
      transactionDateTime: completedAt,
    };
  }

  private listenForUpdates(): void {
    this.snapshotSubscription = this.vietQrPaymentFlow.snapshot$.subscribe(
      (snapshot) => {
        if (!snapshot) return;

        this.applySnapshot(snapshot);
        const status = snapshot.latestTransaction?.status;

        if (status === PAYMENT_STATUS.REFUND_REQUIRED) {
          this.stateStore.patch({
            errorMessage: 'Payment could not be completed.',
          });
        }
      },
    );
  }

  private handleExpiredPayment(): void {
    if (this.isHandlingExpiredPayment) return;

    this.isHandlingExpiredPayment = true;
    this.vietQrPaymentFlow.stop();
    this.stateStore.patch({
      isLoading: false,
      statusMessage:
        'The QR code has expired. This order will be cancelled and you will be returned to your cart.',
      errorMessage: '',
    });

    window.setTimeout(() => this.paymentExpiredHandler?.(), 1800);
  }

  private applySnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.currentSnapshot = snapshot;
    this.stateStore.patch({
      isVietQrSuccess:
        snapshot.latestTransaction?.status === PAYMENT_STATUS.SUCCESS,
      statusMessage:
        snapshot.latestTransaction?.status === PAYMENT_STATUS.SUCCESS
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
