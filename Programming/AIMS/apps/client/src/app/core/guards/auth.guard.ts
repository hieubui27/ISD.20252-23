import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { map, take, switchMap } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure user is loaded first
  return authService.fetchMe().pipe(
    switchMap(() => authService.user$),
    take(1),
    map((user) => {
      if (user) {
        return true;
      }
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }),
  );
};
