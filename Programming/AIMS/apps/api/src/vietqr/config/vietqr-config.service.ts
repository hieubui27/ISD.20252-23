import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

export interface VietqrOutboundCredentials {
  username: string;
  password: string;
}

export interface VietqrGenerateQRCodeConfig {
  bankCode: string;
  bankAccount: string;
  userBankName: string;
  qrType: string;
  transType: string;
  terminalCode?: string;
  subTerminalCode?: string;
  serviceCode?: string;
}

export interface VietqrTestCallbackDefaults {
  bankAccount: string;
  bankCode: string;
  transType: string;
}

@Injectable()
export class VietqrConfigService {
  get(key: string): string | undefined {
    return process.env[key];
  }

  getBaseUrl(): string {
    return this.get('VIETQR_BASE_URL') || 'https://dev.vietqr.org';
  }

  getReturnUrl(): string | undefined {
    return this.get('VIETQR_RETURN_URL');
  }

  getCallbackToken(): string | undefined {
    return this.get('VIETQR_CALLBACK_TOKEN');
  }

  getOutboundCredentials(): VietqrOutboundCredentials {
    const username = this.get('VIETQR_USERNAME');
    const password = this.get('VIETQR_PASSWORD');

    if (!username || !password) {
      throw new UnauthorizedException('VietQR credentials are not configured');
    }

    return { username, password };
  }

  getGenerateQRCodeConfig(): VietqrGenerateQRCodeConfig {
    const bankCode = this.getRequiredPaymentConfig('VIETQR_BANK_CODE').trim();
    const bankAccount = this.getRequiredPaymentConfig(
      'VIETQR_BANK_ACCOUNT',
    ).trim();
    const userBankName = this.getRequiredPaymentConfig(
      'VIETQR_USER_BANK_NAME',
    ).trim();
    const qrType = (this.get('VIETQR_QR_TYPE') || '0').trim();
    const transType = this.getTransType();

    this.validateVietqrBankFields(bankCode, bankAccount, userBankName);
    this.validateQrType(qrType);
    this.validateTransType(transType);

    return {
      bankCode,
      bankAccount,
      userBankName,
      qrType,
      transType,
      terminalCode: this.getOptionalTrimmed('VIETQR_TERMINAL_CODE'),
      subTerminalCode: this.getOptionalTrimmed('VIETQR_SUB_TERMINAL_CODE'),
      serviceCode: this.getOptionalTrimmed('VIETQR_SERVICE_CODE'),
    };
  }

  getTestCallbackDefaults(): VietqrTestCallbackDefaults {
    return {
      bankAccount: this.getRequiredPaymentConfig('VIETQR_BANK_ACCOUNT'),
      bankCode: this.getRequiredPaymentConfig('VIETQR_BANK_CODE'),
      transType: this.getTransType(),
    };
  }

  getTransType(): string {
    return (this.get('VIETQR_TRANS_TYPE') || 'C').trim();
  }

  getInboundRequiredEnv(key: string): string {
    const value = this.get(key);

    if (!value) {
      throw new InternalServerErrorException(
        `Thiếu cấu hình môi trường ${key} cho VietQR inbound`,
      );
    }

    return value;
  }

  private getRequiredPaymentConfig(name: string): string {
    const value = this.get(name);
    if (!value) {
      throw new BadRequestException(`${name} is not configured`);
    }

    return value;
  }

  private getOptionalTrimmed(name: string): string | undefined {
    const value = this.get(name)?.trim();
    return value || undefined;
  }

  private validateVietqrBankFields(
    bankCode: string,
    bankAccount: string,
    userBankName: string,
  ): void {
    if (!/^[A-Za-z0-9]{2,20}$/.test(bankCode)) {
      throw new BadRequestException('VIETQR_BANK_CODE is invalid');
    }

    if (!/^[A-Za-z0-9._-]{4,40}$/.test(bankAccount)) {
      throw new BadRequestException('VIETQR_BANK_ACCOUNT is invalid');
    }

    if (!userBankName || userBankName.length > 100) {
      throw new BadRequestException('VIETQR_USER_BANK_NAME is invalid');
    }
  }

  private validateQrType(qrType: string): void {
    if (!/^\d{1,2}$/.test(qrType)) {
      throw new BadRequestException('VIETQR_QR_TYPE is invalid');
    }
  }

  private validateTransType(transType: string): void {
    if (!['C', 'D'].includes(transType)) {
      throw new BadRequestException('VIETQR_TRANS_TYPE is invalid');
    }
  }
}

export { VietqrConfigService as ConfigService };
