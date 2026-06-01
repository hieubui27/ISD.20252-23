import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class ForgotPasswordLogic {
  private authService = inject(AuthService);
  private router = inject(Router);

  public executeForgotPassword(
    email: string,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        setTimeout(() => {
          onSuccess();
          console.log('gui yeu cau reset password thanh cong');

          setTimeout(() => this.router.navigate(['/auth/verify-otp']), 1500);
        }, 1000);
      },
      error: (err) => {
        const errorMsg =
          err.status === 404
            ? 'Email does not exist in the system'
            : 'System error';
        onError(errorMsg);
      },
    });
  }
}
