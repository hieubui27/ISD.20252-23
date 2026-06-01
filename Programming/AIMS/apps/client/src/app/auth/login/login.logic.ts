import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoginLogic {
  private authService = inject(AuthService);
  private router = inject(Router);

  public executeLogin(
    payload: any,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    this.authService.login(payload).subscribe({
      next: () => {
        onSuccess();
        console.log('dang nhap thanh cong');

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.log('dang nhap that bai');
        const errorMsg =
          err.status === 401 ? 'Invalid username or password' : 'System error';
        onError(errorMsg);
      },
    });
  }
}
