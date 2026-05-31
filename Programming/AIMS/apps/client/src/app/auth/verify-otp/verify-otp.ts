import {
  Component,
  ElementRef,
  ViewChildren,
  QueryList,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthPageBase } from '../auth-page.base';
import { VerifyOtpLogic } from './verify-otp.logic';
import { AimsButtonComponent } from '../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../shared/ui/aims-icon/aims-icon';

@Component({
  selector: 'app-verify-otp',
  imports: [CommonModule, FormsModule, AimsButtonComponent, AimsIconComponent],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.scss',
  standalone: true,
})
export class VerifyOtp extends AuthPageBase implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = '';
  isResending = false;
  resendSuccessMsg = '';

  private logic = inject(VerifyOtpLogic);
  protected cdr = inject(ChangeDetectorRef);

  constructor() {
    super();
  }

  ngOnInit() {
    const savedEmail = sessionStorage.getItem('reset_email');
    if (savedEmail) {
      this.email = savedEmail;
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    if (!pastedData) return;

    const numbers = pastedData.replace(/\D/g, '').split('').slice(0, 6);

    if (numbers.length > 0) {
      const inputs = this.otpInputs.toArray();
      numbers.forEach((num, index) => {
        if (inputs[index]) {
          inputs[index].nativeElement.value = num;
        }
      });

      const focusIndex = numbers.length === 6 ? 5 : numbers.length;
      inputs[focusIndex]?.nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    const inputs = this.otpInputs.toArray();

    if (
      event.ctrlKey ||
      event.metaKey ||
      ['ArrowLeft', 'ArrowRight', 'Tab', 'Delete'].includes(event.key)
    ) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      input.value = event.key;
      event.preventDefault();
      if (index < 5) {
        inputs[index + 1].nativeElement.focus();
      }
    } else if (event.key === 'Backspace') {
      if (input.value === '' && index > 0) {
        inputs[index - 1].nativeElement.focus();
        inputs[index - 1].nativeElement.value = '';
      } else {
        input.value = '';
      }
      event.preventDefault();
    } else {
      event.preventDefault();
    }
  }

  resend() {
    if (this.isResending || !this.email) return;

    this.isResending = true;
    this.resendSuccessMsg = '';
    this.cdr.detectChanges();

    this.logic.executeResendOtp(
      this.email,
      () => {
        this.isResending = false;
        this.resendSuccessMsg = 'Mã mới đã được gửi!';
        this.cdr.detectChanges();

        // Ẩn thông báo sau 3 giây
        setTimeout(() => {
          this.resendSuccessMsg = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      (msg) => {
        this.isResending = false;
        this.resendSuccessMsg = msg; // Tạm dùng biến này để hiện lỗi nếu có
        this.cdr.detectChanges();
      },
    );
  }

  onSubmit() {
    if (this.isPending) return;

    const inputs = this.otpInputs.toArray();
    const otpCode = inputs.map((input) => input.nativeElement.value).join('');

    if (otpCode.length < 6) {
      this.setError('Vui lòng nhập đủ 6 số.');
      return;
    }

    this.beginLoading();
    this.cdr.detectChanges();

    this.logic.executeVerifyOtp(
      this.email,
      otpCode,
      () => {
        sessionStorage.setItem('otp_verified_email', this.email);
        this.setSuccess('Xác thực thành công!');
        this.cdr.detectChanges();
      },
      (msg) => {
        this.setError(msg);
        this.cdr.detectChanges();
      },
    );
  }
}
