import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
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

@Injectable({ providedIn: 'root' })
export class VietQrPaymentFlowService
  implements
    PaymentFlowStrategy<VietQrPaymentInput, VietQrPaymentSnapshot>,
    OnDestroy
{
  private readonly placeOrderApi = inject(PlaceOrderApiService);
  private readonly paymentStatusApi = inject(PaymentStatusApiService);
  private readonly stop$ = new Subject<void>();
  private sandboxCallbackSubscription?: Subscription;
  private pollingSubscription?: Subscription;
  private latestSnapshot$ =
    new BehaviorSubject<VietQrPaymentSnapshot | null>(null);

  get snapshot$(): Observable<VietQrPaymentSnapshot | null> {
    return this.latestSnapshot$.asObservable();
  }

  get currentSnapshot(): VietQrPaymentSnapshot | null {
    return this.latestSnapshot$.value;
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
          this.latestSnapshot$.next(snapshot);
          this.startPolling(payment.orderId);
        }),
        switchMap((payment) => this.snapshotForOrder(payment)),
        tap((snapshot) => this.requestSandboxCallback(snapshot)),
      );
  }

  stop(): void {
    this.stop$.next();
    this.sandboxCallbackSubscription?.unsubscribe();
    this.pollingSubscription?.unsubscribe();
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
        this.latestSnapshot$.next({ payment, latestTransaction });
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

          this.latestSnapshot$.next({
            ...current,
            latestTransaction,
          });

          if (this.isTerminalStatus(latestTransaction.status)) {
            this.stop();
          }
        },
      });
  }

  private requestSandboxCallback(snapshot: VietQrPaymentSnapshot): void {
    const orderId = snapshot.payment.orderId;
    const latestTransaction = snapshot.latestTransaction;
    const content =
      latestTransaction?.qrContent ||
      (latestTransaction?.gatewayOrderId
        ? `AIMS ${latestTransaction.gatewayOrderId}`
        : `AIMS ${this.buildGatewayOrderId(snapshot.payment.paymentTransactionId)}`);

    if (!content) return;

    this.sandboxCallbackSubscription?.unsubscribe();
    this.sandboxCallbackSubscription = this.paymentStatusApi
      .requestVietQrSandboxCallback({
        amount: snapshot.payment.totalAmount,
        content,
        transType: VIETQR_TRANS_TYPE_CREDIT,
      })
      .pipe(
        takeUntil(this.stop$),
        switchMap(() => this.paymentStatusApi.getLatestByOrderId(orderId)),
        tap((transaction) => {
          this.latestSnapshot$.next({
            payment: snapshot.payment,
            latestTransaction: transaction,
          });
        }),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return (
      status === 'SUCCESS' ||
      status === 'FAILED' ||
      status === 'REFUND_REQUIRED'
    );
  }

  private buildGatewayOrderId(transactionId: string): string {
    return transactionId.replace(/-/g, '').slice(0, 13).toUpperCase();
  }
}
