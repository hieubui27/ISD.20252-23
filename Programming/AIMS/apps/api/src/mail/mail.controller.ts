import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { sendMailDto, SendInvitationDto } from './dto/email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly emailService: MailService) {}

  @Post('send')
  async sendMail(@Body() dto: sendMailDto) {
    await this.emailService.sendMail(dto);
    return { message: `Mail sent successfully` };
  }

  @Post('send-invitation')
  async sendInvitation(@Body() dto: SendInvitationDto) {
    await this.emailService.sendInvitation(dto);
    return { message: `Invitation mail sent successfully` };
  }
}
