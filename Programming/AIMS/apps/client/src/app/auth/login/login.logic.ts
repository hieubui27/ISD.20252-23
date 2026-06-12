import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { delay } from 'rxjs/operators';
import { AuthContext } from '../../core/contexts/auth.context';

@Injectable({ providedIn: 'root' })
export class LoginLogic {
  private authService = inject(AuthService);
  private router = inject(Router);
  private authContext = inject(AuthContext);

  public executeLogin(
    payload: any,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ): void {
    this.authService.login(payload).subscribe({
      next: () => {
        this.authContext.setLoggedIn();
        onSuccess();
        console.log('dang nhap thanh cong');

        this.authService.fetchMe().subscribe({
          next: () => {
            setTimeout(() => {
              if (this.authService.hasRole('Product Manager')) {
                this.router.navigate(['/manager/products']);
              } else if (this.authService.hasRole('Administrator')) {
                this.router.navigate(['/manager/admin/users']);
              } else {
                this.router.navigate(['/product-catalog']);
              }
            }, 1500);
          },
          error: () => {
            setTimeout(() => {
              this.router.navigate(['/product-catalog']);
            }, 1500);
          },
        });
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
