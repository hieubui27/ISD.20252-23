import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class ResetPasswordLogic {
  private authService = inject(AuthService);
  private router = inject(Router);

  public executeResetPassword(
    payload: any,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    this.authService.resetPassword(payload).subscribe({
      next: () => {
        onSuccess();
        console.log('Doi mat khau thanh cong');
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        const errorMsg =
          err.status === 400
            ? 'Thông tin không hợp lệ'
            : 'Lỗi hệ thống khi đổi mật khẩu';
        onError(errorMsg);
      },
    });
  }
}
