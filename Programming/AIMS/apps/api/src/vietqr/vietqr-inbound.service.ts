import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { VietqrConfigService } from './config/vietqr-config.service';

interface BasicAuthCredentials {
  username: string;
  password: string;
}

interface InboundAccessTokenPayload {
  sub?: string;
  nonce?: string;
  exp?: number;
}

@Injectable()
export class VietqrInboundService {
  constructor(private readonly configService: VietqrConfigService) {}

  generateAccessToken(authorization?: string) {
    const credentials = this.parseBasicAuth(authorization);
    this.validateInboundCredentials(credentials.username, credentials.password);

    const expiresIn = this.getInboundTokenExpiresInSeconds();
    const secret = this.getRequiredEnv('VIETQR_INBOUND_TOKEN_SECRET');
    const payload = Buffer.from(
      JSON.stringify({
        sub: credentials.username,
        nonce: randomBytes(16).toString('hex'),
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    return {
      access_token: `${payload}.${signature}`,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  validateAccessToken(token: string): void {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) {
      throw new UnauthorizedException('Invalid VietQR callback token');
    }

    const secret = this.getRequiredEnv('VIETQR_INBOUND_TOKEN_SECRET');
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    if (!this.signaturesMatch(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid VietQR callback token');
    }

    const parsedPayload = this.parseAccessTokenPayload(payload);
    const expectedUsername = this.getRequiredEnv('VIETQR_INBOUND_USERNAME');

    if (parsedPayload.sub !== expectedUsername) {
      throw new UnauthorizedException('Invalid VietQR callback token subject');
    }

    if (
      !Number.isInteger(parsedPayload.exp) ||
      parsedPayload.exp < Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('Expired VietQR callback token');
    }
  }

  parseBasicAuth(header?: string): BasicAuthCredentials {
    if (!header || !header.startsWith('Basic ')) {
      throw new UnauthorizedException('Thiếu Basic Authentication');
    }

    try {
      const rawCredentials = Buffer.from(
        header.slice('Basic '.length).trim(),
        'base64',
      ).toString('utf8');
      const separatorIndex = rawCredentials.indexOf(':');

      if (separatorIndex <= 0) {
        throw new UnauthorizedException('Basic Authentication không hợp lệ');
      }

      return {
        username: rawCredentials.slice(0, separatorIndex),
        password: rawCredentials.slice(separatorIndex + 1),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Basic Authentication không hợp lệ');
    }
  }

  validateInboundCredentials(username: string, password: string): void {
    const expectedUsername = this.getRequiredEnv('VIETQR_INBOUND_USERNAME');
    const expectedPassword = this.getRequiredEnv('VIETQR_INBOUND_PASSWORD');

    if (username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Sai thông tin xác thực VietQR inbound');
    }
  }

  private getInboundTokenExpiresInSeconds(): number {
    const rawValue = this.getRequiredEnv(
      'VIETQR_INBOUND_TOKEN_EXPIRES_IN_SECONDS',
    );
    const expiresIn = Number(rawValue);

    if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
      throw new InternalServerErrorException(
        'Cấu hình VIETQR_INBOUND_TOKEN_EXPIRES_IN_SECONDS không hợp lệ',
      );
    }

    return expiresIn;
  }

  private getRequiredEnv(key: string): string {
    return this.configService.getInboundRequiredEnv(key);
  }

  private parseAccessTokenPayload(payload: string): InboundAccessTokenPayload {
    try {
      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as InboundAccessTokenPayload;

      if (!parsed || typeof parsed !== 'object') {
        throw new UnauthorizedException('Invalid VietQR callback token');
      }

      return parsed;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid VietQR callback token');
    }
  }

  private signaturesMatch(
    receivedSignature: string,
    expectedSignature: string,
  ): boolean {
    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);

    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(received, expected);
  }
}
