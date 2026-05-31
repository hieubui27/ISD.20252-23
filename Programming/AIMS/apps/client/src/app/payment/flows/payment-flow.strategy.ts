import { Observable } from 'rxjs';

export interface PaymentFlowStrategy<TInput, TSnapshot> {
  start(input: TInput): Observable<TSnapshot>;
  stop(): void;
}
