import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { map, take, switchMap } from 'rxjs';
import { AuthContext } from '../contexts/auth.context';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const authContext = inject(AuthContext);

  // Ensure user is loaded first
  return authService.fetchMe().pipe(
    switchMap(() => authService.user$),
    take(1),
    map((user) => {
      if (user) {
        authContext.setLoggedIn();
        return true;
      }
      authContext.setLoggedOut();
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }),
  );
};
