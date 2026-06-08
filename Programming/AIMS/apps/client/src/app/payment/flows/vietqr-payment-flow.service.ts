import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  timer,
} from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PlaceOrderApiService } from '../../place-order/services/place-order-api.service';
import { PaymentStatus } from '../../services/payment.service';
import { PaymentStatusApiService } from '../services/payment-status-api.service';
import { PaymentFlowStrategy } from './payment-flow.strategy';
import {
  VietQrPaymentInput,
  VietQrPaymentSnapshot,
} from '../models/vietqr-payment.models';

const POLLING_INTERVAL_MS = 10_000;
const VIETQR_TRANS_TYPE_CREDIT = 'C';
const VIETQR_PAYMENT_SNAPSHOT_KEY = 'aims.vietQrPaymentSnapshot';

@Injectable({ providedIn: 'root' })
/**
 * SOLID review:
 * - SRP: Medium risk. The service is still focused on the VietQR payment flow, but
 *   it combines payment creation, status polling, sandbox callback triggering,
 *   snapshot persistence, and gateway order id derivation.
 * - OCP: Partial violation for callback behavior. Sandbox callback logic is
 *   hardcoded into the flow, so changing environment behavior requires editing
 *   this class.
 * - DIP: Medium risk. It depends on concrete API services and browser localStorage
 *   instead of narrow persistence/status abstractions.
 * - Improvement: Extract PaymentSnapshotStore, PaymentPollingService, and
 *   VietQrSandboxCallbackService. Gate sandbox behavior behind an environment
 *   strategy or feature flag.
 */
export class VietQrPaymentFlowService
  implements
    PaymentFlowStrategy<VietQrPaymentInput, VietQrPaymentSnapshot>,
    OnDestroy
{
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly paymentStatusApi = inject(PaymentStatusApiService);
  private readonly stop$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  private latestSnapshot$ =
    new BehaviorSubject<VietQrPaymentSnapshot | null>(this.readStoredSnapshot());

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

    return this.placeOrderApi
      .createPayment({
        ...input,
        paymentMethod: 'VIETQR',
      })
      .pipe(
        tap((payment) => {
          const snapshot: VietQrPaymentSnapshot = { payment };
          this.setSnapshot(snapshot);
          this.startPolling(payment.orderId);
        }),
        switchMap((payment) => this.snapshotForOrder(payment)),
      );
  }

  confirmCurrentPayment(): Observable<VietQrPaymentSnapshot> {
    const snapshot = this.latestSnapshot$.value;

    if (!snapshot) {
      throw new Error('VietQR payment has not been created yet.');
    }

    return this.paymentStatusApi.getLatestByOrderId(snapshot.payment.orderId).pipe(
      tap((latestTransaction) => {
        this.setSnapshot({
          ...snapshot,
          latestTransaction,
        });
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
    return this.paymentStatusApi.getLatestByOrderId(payment.orderId).pipe(
      tap((latestTransaction) => {
        this.setSnapshot({ payment, latestTransaction });
      }),
      map((latestTransaction) => ({ payment, latestTransaction })),
      catchError(() => [{ payment }]),
    );
  }

  private startPolling(orderId: string): void {
    this.pollingSubscription = timer(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS)
      .pipe(
        takeUntil(this.stop$),
        switchMap(() => this.paymentStatusApi.getLatestByOrderId(orderId)),
      )
      .subscribe({
        next: (latestTransaction) => {
          const current = this.latestSnapshot$.value;
          if (!current) return;

          this.setSnapshot({
            ...current,
            latestTransaction,
          });

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
        switchMap(() => this.paymentStatusApi.getLatestByOrderId(orderId)),
        tap((transaction) => {
          this.setSnapshot({
            payment: snapshot.payment,
            latestTransaction: transaction,
          });
        }),
        map((transaction) => ({
          payment: snapshot.payment,
          latestTransaction: transaction,
        })),
      );
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return (
      status === 'SUCCESS' ||
      status === 'FAILED' ||
      status === 'REFUND_REQUIRED'
    );
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
