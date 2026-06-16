import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import {
  sendMailDto,
  SendInvitationDto,
  SendOtpCodeDto,
} from './dto/email.dto';
import { getInvitationEmailTemplate } from './templates/invitation.template';
import { getOtpCodeTemplate } from './templates/get-otp-code.template';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}
  emailTransport() {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      family: 4,
    });
    return transporter;
  }

  async sendMail(dto: sendMailDto) {
    const recipientEmail = dto.recipientEmail.join(', ');
    const transporter = this.emailTransport();
    const options: nodemailer.SendMailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: recipientEmail,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
    };
    try {
      await transporter.sendMail(options);
      console.log(`Mail sent successfully to: ${recipientEmail}`);
    } catch (error) {
      console.error(`Send mail error: ${error}`);
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
