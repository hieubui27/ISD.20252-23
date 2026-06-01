import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class VerifyOtpLogic {
  private authService = inject(AuthService);
  private router = inject(Router);

  public executeVerifyOtp(
    email: string,
    otp: string,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    this.authService.verifyOtp(email, otp).subscribe({
      next: () => {
        onSuccess();
        console.log('xac thuc OTP thanh cong');
        setTimeout(() => this.router.navigate(['/auth/reset-password']), 1500);
      },
      error: (err) => {
        const errorMsg =
          err.status === 400
            ? 'OTP code is incorrect or expired'
            : 'System error during verification';
        onError(errorMsg);
      },
    });
  }

  public executeResendOtp(
    email: string,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    // Sử dụng lại hàm forgotPassword vì bản chất là gửi lại mã OTP vào email đó
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        setTimeout(() => {
          onSuccess();
          console.log('gui lai OTP thanh cong');
        }, 1000);
      },
      error: (err) => {
        const errorMsg = 'System error when resending code';
        onError(errorMsg);
      },
    });
  }
}
