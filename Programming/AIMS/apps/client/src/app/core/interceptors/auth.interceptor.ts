import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  switchMap,
  throwError,
  BehaviorSubject,
  filter,
  take,
} from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthContext } from '../contexts/auth.context';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authContext = inject(AuthContext);

  // Clone the request to add withCredentials globally
  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignore 401s from the refresh endpoint itself to prevent infinite loops
      if (
        error.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap(() => {
              isRefreshing = false;
              refreshTokenSubject.next(true);
              return next(authReq);
            }),
            catchError((err) => {
              isRefreshing = false;
              authService.logoutLocal(); // clear state
              authContext.setLoggedOut(); // clear context flag
              router.navigate(['/auth/login']);
              return throwError(() => err);
            }),
          );
        } else {
          // If already refreshing, wait for it to finish and retry
          return refreshTokenSubject.pipe(
            filter((result) => result !== null),
            take(1),
            switchMap(() => next(authReq)),
          );
        }
      }

      if (error.status === 401) {
        // Direct 401 from other unhandled or failed refresh requests
        authContext.setLoggedOut();
      }

      if (error.status === 403) {
        toastService.showError(
          '403 Forbidden: You do not have permission to access this resource.',
        );
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
