import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { AuthPageBase } from '../auth-page.base';
import { LoginLogic } from './login.logic';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  standalone: true,
})
export class Login extends AuthPageBase {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
    ]),
    rememberMe: new FormControl(false),
  });

  private loginLogic = inject(LoginLogic);
  protected cdr = inject(ChangeDetectorRef);

  constructor() {
    super();
  }

  get f() {
    return this.loginForm.controls;
  }

  toggleRememberMe() {
    const currentValue = this.loginForm.get('rememberMe')?.value;
    this.loginForm.patchValue({ rememberMe: !currentValue });
  }

  onSubmit() {
    if (this.loginForm.invalid || this.isPending) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.beginLoading();
    this.cdr.detectChanges(); // Ép cập nhật UI khi bắt đầu quay

    this.loginLogic.executeLogin(
      this.loginForm.value,
      () => {
        this.setSuccess('Thành công!');
        this.cdr.detectChanges(); // Ép cập nhật UI thành công
      },
      (msg) => {
        this.setError(msg);
        this.cdr.detectChanges(); // Ép cập nhật UI lỗi
      },
    );
  }
}
