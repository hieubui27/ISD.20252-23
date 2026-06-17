import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  sendMailDto,
  SendInvitationDto,
  SendOtpCodeDto,
} from './dto/email.dto';
import { getInvitationEmailTemplate } from './templates/invitation.template';
import { getOtpCodeTemplate } from './templates/get-otp-code.template';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    // Requires RESEND_API_KEY in .env
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendMail(dto: sendMailDto) {
    // Sử dụng domain cá nhân đã verify trên Resend (vd: no-reply@aims.io.vn)
    // Để gửi được cho tất cả mọi người, biến RESEND_FROM_EMAIL phải dùng domain bạn đã verify.
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'no-reply@aims.io.vn';

    try {
      const { data, error } = await this.resend.emails.send({
        from: `AIMS System <${fromEmail}>`,
        to: dto.recipientEmail,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });

      if (error) {
        this.logger.error(`Resend API Error: ${JSON.stringify(error)}`);
        return;
      }

      this.logger.log(
        `Mail sent successfully to: ${dto.recipientEmail.join(', ')}. ID: ${data?.id}`,
      );
    } catch (error) {
      this.logger.error(`Send mail exception: ${error}`);
    }
  }

  async sendInvitation(dto: SendInvitationDto) {
    const htmlContent = getInvitationEmailTemplate(
      dto.username,
      dto.password,
      dto.loginLink,
    );

    return this.sendMail({
      recipientEmail: dto.recipientEmail,
      subject: 'Thông tin tài khoản và Hướng dẫn đăng nhập hệ thống AIMS',
      html: htmlContent,
    });
  }

  async sendOtpCode(dto: SendOtpCodeDto) {
    const htmlContent = getOtpCodeTemplate(
      dto.username,
      dto.otp,
      dto.expirationTime,
    );
    return this.sendMail({
      recipientEmail: dto.recipientEmail,
      subject: 'Mã OTP xác thực',
      html: htmlContent,
    });
  }
}
