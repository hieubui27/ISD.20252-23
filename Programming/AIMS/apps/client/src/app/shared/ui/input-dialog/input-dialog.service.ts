import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface InputDialogConfig {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  requireInput?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InputDialogService {
  private configSubject = new Subject<InputDialogConfig | null>();
  public config$ = this.configSubject.asObservable();

  private responseSubject = new Subject<string | null>();

  public prompt(config: InputDialogConfig): Promise<string | null> {
    this.configSubject.next(config);
    return new Promise((resolve) => {
      const sub = this.responseSubject.subscribe((res) => {
        sub.unsubscribe();
        this.configSubject.next(null);
        resolve(res);
      });
    });
  }

  public respond(res: string | null): void {
    this.responseSubject.next(res);
  }
}
