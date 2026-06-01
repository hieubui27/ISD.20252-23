import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { map, take, switchMap } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const expectedRoles = route.data?.['roles'] as Array<string>;

  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  return authService.fetchMe().pipe(
    switchMap(() => authService.user$),
    take(1),
    map((user) => {
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }

      const hasRole = expectedRoles.some((role) => authService.hasRole(role));
      console.log(authService.user$);
      if (hasRole) {
        return true;
      }

      toastService.showError(
        '403 Forbidden: You do not have permission to access this page.',
      );
      router.navigate(['/auth/login']);
      return false;
    }),
  );
};
