import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';
import { ForgotPassword } from './forgot-password/forgot-password';
import { VerifyOtp } from './verify-otp/verify-otp';
import { ResetPassword } from './reset-password/reset-password';

import {
  verifyOtpGuard,
  resetPasswordGuard,
} from './guards/password-flow.guard';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'verify-otp', component: VerifyOtp, canActivate: [verifyOtpGuard] },
  {
    path: 'reset-password',
    component: ResetPassword,
    canActivate: [resetPasswordGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    Login,
    ForgotPassword,
    VerifyOtp,
    ResetPassword,
  ],
})
export class AuthModule {}
