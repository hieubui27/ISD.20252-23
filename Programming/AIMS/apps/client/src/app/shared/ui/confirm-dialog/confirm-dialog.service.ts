import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private configSubject = new Subject<ConfirmDialogConfig | null>();
  public config$ = this.configSubject.asObservable();

  private responseSubject = new Subject<boolean>();

  public confirm(config: ConfirmDialogConfig): Promise<boolean> {
    this.configSubject.next(config);
    return new Promise((resolve) => {
      const sub = this.responseSubject.subscribe((res) => {
        sub.unsubscribe();
        this.configSubject.next(null);
        resolve(res);
      });
    });
  }

  public respond(res: boolean): void {
    this.responseSubject.next(res);
  }
}
