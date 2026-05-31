import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> =
    this.toastsSubject.asObservable();

  showError(message: string): void {
    this.addToast(message, 'error');
  }

  showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  private addToast(message: string, type: 'error' | 'success' | 'info'): void {
    const id = Math.random().toString(36).substring(2, 11);
    const toast: ToastMessage = { id, message, type };
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this.removeToast(id);
    }, 5000);
  }

  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter((t) => t.id !== id));
  }
}
