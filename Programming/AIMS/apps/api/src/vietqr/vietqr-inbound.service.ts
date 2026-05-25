import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { ConfigService } from './config/vietqr-config.service';

interface BasicAuthCredentials {
  username: string;
  password: string;
}

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service depends only on ConfigService and primitive Basic Auth/token data.
 * - It does not update payment transactions, orders, or outbound VietQR API state.
 *
 * Cohesion reason:
 * - All methods support the single inbound VietQR authentication responsibility: parse credentials, validate them, and issue a temporary token.
 */
@Injectable()
export class VietqrInboundService {
  constructor(private readonly configService: ConfigService) {}

  // API INBOUND: VietQR calls AIMS backend to test merchant connection.
  // This is different from VIETQR_USERNAME/VIETQR_PASSWORD, which are
  // outbound credentials VietQR gives AIMS for calling VietQR APIs.
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
    const value = this.configService.get(key);

    if (!value) {
      throw new InternalServerErrorException(
        `Thiếu cấu hình môi trường ${key} cho VietQR inbound`,
      );
    }

    return value;
  }
}
