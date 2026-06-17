import { Injectable } from '@nestjs/common';
import { VietqrGenerateQRCodeRequest } from '../clients/vietqr.client';
import { VietqrConfigService } from '../config/vietqr-config.service';
import { VietqrRequestDto } from '../dto/vietqr-request.dto';
import { normalizeVietqrContent } from '../helpers/vietqr-normalize.helper';

@Injectable()
export class VietqrQrRequestBuilder {
  constructor(private readonly configService: VietqrConfigService) {}

  build(request: VietqrRequestDto): VietqrGenerateQRCodeRequest {
    const config = this.configService.getGenerateQRCodeConfig();
    const content = normalizeVietqrContent(request.description);
    const note = request.description?.trim() || content;

    return {
      bankCode: config.bankCode,
      bankAccount: config.bankAccount,
      userBankName: config.userBankName,
      content,
      qrType: config.qrType,
      amount: request.amount,
      orderId: request.orderId,
      transType: config.transType,
      terminalCode: config.terminalCode,
      subTerminalCode: config.subTerminalCode,
      serviceCode: config.serviceCode,
      urlLink: request.returnUrl || this.configService.getReturnUrl(),
      note,
    };
  }
}
