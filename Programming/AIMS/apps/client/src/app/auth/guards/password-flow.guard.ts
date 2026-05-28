import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const verifyOtpGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const savedEmail = sessionStorage.getItem('reset_email');

  if (!savedEmail) {
    return router.parseUrl('/auth/forgot-password');
  }
  return true;
};

export const resetPasswordGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const verifiedEmail = sessionStorage.getItem('otp_verified_email');

  if (!verifiedEmail) {
    const savedEmail = sessionStorage.getItem('reset_email');
    if (savedEmail) {
      return router.parseUrl('/auth/verify-otp');
    }
    return router.parseUrl('/auth/forgot-password');
  }
  return true;
};
