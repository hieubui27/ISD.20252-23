import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  Subscription,
  timer,
} from 'rxjs';
import {
  catchError,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { PaymentService, PaymentStatus } from '../../services/payment.service';
import { PaymentStatusApiService } from '../services/payment-status-api.service';
import { mapPaymentResult } from '../services/payment-result.utils';
import { PaymentFlowStrategy } from './payment-flow.strategy';
import {
  ExistingPaymentContext,
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/payment.constants';

const POLLING_INTERVAL_MS = 10_000;
const VIETQR_TRANS_TYPE_CREDIT = 'C';
const VIETQR_PAYMENT_SNAPSHOT_KEY = 'aims.vietQrPaymentSnapshot';

@Injectable({ providedIn: 'root' })
/**
 * VietQR flow owner: creates the payment request, stores the latest snapshot,
 * polls transaction status, and triggers the sandbox callback used by this app.
 * If production and sandbox behavior diverge later, move the callback call behind
 * a small environment-specific service.
 */
export class VietQrPaymentFlowService
  implements
    PaymentFlowStrategy<VietQrPaymentInput, VietQrPaymentSnapshot>,
    OnDestroy
{
  private readonly paymentService = inject(PaymentService);
  private readonly paymentStatusApi = inject(PaymentStatusApiService);
  private readonly stop$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  private latestSnapshot$ = new BehaviorSubject<VietQrPaymentSnapshot | null>(
    this.readStoredSnapshot(),
  );

  get snapshot$(): Observable<VietQrPaymentSnapshot | null> {
    return this.latestSnapshot$.asObservable();
  }

  get currentSnapshot(): VietQrPaymentSnapshot | null {
    return this.latestSnapshot$.value;
  }

  resume(snapshot: VietQrPaymentSnapshot): void {
    this.setSnapshot(snapshot);
    this.startPolling(snapshot.payment.orderId);
  }

  start(input: VietQrPaymentInput): Observable<VietQrPaymentSnapshot> {
    this.stop();

    return this.requestPayment(input.existingPayment).pipe(
      switchMap((payment) => {
        const snapshot: VietQrPaymentSnapshot = { payment };
        this.setSnapshot(snapshot);
        this.startPolling(payment.orderId);

        return this.snapshotForOrder(payment).pipe(startWith(snapshot));
      }),
    );
  }

  private requestPayment(
    existingPayment: ExistingPaymentContext,
  ): Observable<VietQrPaymentSnapshot['payment']> {
    return this.paymentService
      .requestPayment({
        orderId: existingPayment.orderId,
        invoiceId: existingPayment.invoiceId,
        paymentMethod: PAYMENT_METHOD.VIETQR,
        amount: existingPayment.totalAmount,
        customerEmail: existingPayment.customerEmail,
      })
      .pipe(
        map((paymentResult) =>
          mapPaymentResult(existingPayment, paymentResult),
        ),
      );
  }

  confirmCurrentPayment(): Observable<VietQrPaymentSnapshot> {
    const snapshot = this.latestSnapshot$.value;

    if (!snapshot) {
      throw new Error('VietQR payment has not been created yet.');
    }

    return this.paymentStatusApi
      .getLatestByOrderId(snapshot.payment.orderId, PAYMENT_METHOD.VIETQR)
      .pipe(
        tap((latestTransaction) => {
          this.setLatestTransaction(snapshot, latestTransaction);
        }),
        switchMap((latestTransaction) =>
          this.requestSandboxCallback({
            ...snapshot,
            latestTransaction,
          }),
        ),
      );
  }

  stop(): void {
    this.stop$.next();
    this.pollingSubscription?.unsubscribe();
  }

  clearSnapshot(): void {
    this.latestSnapshot$.next(null);
    localStorage.removeItem(VIETQR_PAYMENT_SNAPSHOT_KEY);
  }

  ngOnDestroy(): void {
    this.stop();
    this.stop$.complete();
    this.latestSnapshot$.complete();
  }

  private snapshotForOrder(
    payment: VietQrPaymentSnapshot['payment'],
  ): Observable<VietQrPaymentSnapshot> {
    return this.paymentStatusApi
      .getLatestByOrderId(payment.orderId, PAYMENT_METHOD.VIETQR)
      .pipe(
        tap((latestTransaction) => {
          this.setSnapshot({ payment, latestTransaction });
        }),
        map((latestTransaction) => ({ payment, latestTransaction })),
        catchError(() => of({ payment })),
      );
  }

  private startPolling(orderId: string): void {
    this.pollingSubscription = timer(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS)
      .pipe(
        takeUntil(this.stop$),
        switchMap(() =>
          this.paymentStatusApi.getLatestByOrderId(
            orderId,
            PAYMENT_METHOD.VIETQR,
          ),
        ),
      )
      .subscribe({
        next: (latestTransaction) => {
          const current = this.latestSnapshot$.value;
          if (!current) return;

          this.setLatestTransaction(current, latestTransaction);

          if (this.isTerminalStatus(latestTransaction.status)) {
            this.stop();
          }
        },
      });
  }

  private requestSandboxCallback(
    snapshot: VietQrPaymentSnapshot,
  ): Observable<VietQrPaymentSnapshot> {
    const orderId = snapshot.payment.orderId;
    const latestTransaction = snapshot.latestTransaction;
    const content = latestTransaction?.qrContent;

    if (!content) {
      throw new Error('VietQR callback content is missing.');
    }

    return this.paymentStatusApi
      .requestVietQrSandboxCallback({
        amount: snapshot.payment.totalAmount,
        content,
        transType: VIETQR_TRANS_TYPE_CREDIT,
      })
      .pipe(
        takeUntil(this.stop$),
        switchMap(() =>
          this.paymentStatusApi.getLatestByOrderId(
            orderId,
            PAYMENT_METHOD.VIETQR,
          ),
        ),
        tap((transaction) => {
          this.setLatestTransaction(snapshot, transaction);
        }),
        map((transaction) => ({
          payment: snapshot.payment,
          latestTransaction: transaction,
        })),
      );
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return (
      status === PAYMENT_STATUS.SUCCESS ||
      status === PAYMENT_STATUS.FAILED ||
      status === PAYMENT_STATUS.REFUND_REQUIRED
    );
  }

  private setLatestTransaction(
    snapshot: VietQrPaymentSnapshot,
    latestTransaction: VietQrPaymentSnapshot['latestTransaction'],
  ): void {
    this.setSnapshot({
      ...snapshot,
      latestTransaction,
    });
  }

  private setSnapshot(snapshot: VietQrPaymentSnapshot): void {
    this.latestSnapshot$.next(snapshot);
    localStorage.setItem(VIETQR_PAYMENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  private readStoredSnapshot(): VietQrPaymentSnapshot | null {
    const rawSnapshot = localStorage.getItem(VIETQR_PAYMENT_SNAPSHOT_KEY);
    if (!rawSnapshot) return null;

    try {
      return JSON.parse(rawSnapshot) as VietQrPaymentSnapshot;
    } catch {
      localStorage.removeItem(VIETQR_PAYMENT_SNAPSHOT_KEY);
      return null;
    }
  }
}
