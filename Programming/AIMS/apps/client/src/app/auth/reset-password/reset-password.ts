import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthPageBase } from '../auth-page.base';
import { ResetPasswordLogic } from './reset-password.logic';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../shared/ui/aims-icon/aims-icon';

// Custom validator to check if both passwords match
export function matchPasswordValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    return { mismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AimsButtonComponent,
    AimsIconComponent,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  standalone: true,
})
export class ResetPassword extends AuthPageBase implements OnInit {
  showPassword = false;
  showConfirmPassword = false;
  email = '';

  resetForm = new FormGroup(
    {
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/(?=.*\d)/), // At least one number
        Validators.pattern(/(?=.*[!@#$%^&*])/), // At least one special symbol
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: matchPasswordValidator },
  );

  private logic = inject(ResetPasswordLogic);
  protected cdr = inject(ChangeDetectorRef);

  constructor() {
    super();
  }

  ngOnInit() {
    const verifiedEmail = sessionStorage.getItem('otp_verified_email');
    if (verifiedEmail) {
      this.email = verifiedEmail;
    }
  }

  get f() {
    return this.resetForm.controls;
  }

  // Dynamic getters for the UI checkmarks
  get hasMinLength(): boolean {
    const pwd = this.f.newPassword.value || '';
    return pwd.length >= 8;
  }

  get hasNumber(): boolean {
    const pwd = this.f.newPassword.value || '';
    return /(?=.*\d)/.test(pwd);
  }

  get hasSymbol(): boolean {
    const pwd = this.f.newPassword.value || '';
    return /(?=.*[!@#$%^&*])/.test(pwd);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.resetForm.invalid || this.isPending) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.beginLoading();
    this.cdr.detectChanges();

    this.logic.executeResetPassword(
      { email: this.email, newPassword: this.resetForm.value.newPassword },
      () => {
        sessionStorage.removeItem('reset_email');
        sessionStorage.removeItem('otp_verified_email');
        this.setSuccess('Mật khẩu mới đã được lưu!');
        this.cdr.detectChanges();
      },
      (msg) => {
        this.setError(msg);
        this.cdr.detectChanges();
      },
    );
  }
}
