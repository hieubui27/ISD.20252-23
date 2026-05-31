import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { AuthPageBase } from '../auth-page.base';
import { ForgotPasswordLogic } from './forgot-password.logic';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../shared/ui/aims-icon/aims-icon';

@Component({
  selector: 'app-forgot-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AimsButtonComponent,
    AimsIconComponent,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  standalone: true,
})
export class ForgotPassword extends AuthPageBase {
  forgotForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  private logic = inject(ForgotPasswordLogic);
  protected cdr = inject(ChangeDetectorRef);

  constructor() {
    super();
  }

  get f() {
    return this.forgotForm.controls;
  }

  onSubmit() {
    if (this.forgotForm.invalid || this.isPending) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.beginLoading();
    this.cdr.detectChanges();

    this.logic.executeForgotPassword(
      this.forgotForm.value.email!,
      () => {
        sessionStorage.setItem('reset_email', this.forgotForm.value.email!);
        this.setSuccess('Link reset password đã được gửi!');
        this.cdr.detectChanges();
      },
      (msg) => {
        this.setError(msg);
        this.cdr.detectChanges();
      },
    );
  }
}
