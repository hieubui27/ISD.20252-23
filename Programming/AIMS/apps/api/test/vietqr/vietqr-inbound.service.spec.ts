import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '../../src/vietqr/config/vietqr-config.service';
import { VietqrInboundService } from '../../src/vietqr/vietqr-inbound.service';

describe('VietqrInboundService', () => {
  let service: VietqrInboundService;

  beforeEach(() => {
    process.env.VIETQR_INBOUND_USERNAME = 'aims_vietqr_test';
    process.env.VIETQR_INBOUND_PASSWORD = 'Aims@vietqr_test_123456';
    process.env.VIETQR_INBOUND_TOKEN_SECRET = 'test-secret';
    process.env.VIETQR_INBOUND_TOKEN_EXPIRES_IN_SECONDS = '300';

    service = new VietqrInboundService(new ConfigService());
  });

  it('should validate token generated from Basic Auth credentials', () => {
    const credentials = Buffer.from(
      'aims_vietqr_test:Aims@vietqr_test_123456',
    ).toString('base64');
    const result = service.generateAccessToken(`Basic ${credentials}`);

    expect(() => service.validateAccessToken(result.access_token)).not.toThrow();
  });

  it('should reject tampered access token signature', () => {
    const credentials = Buffer.from(
      'aims_vietqr_test:Aims@vietqr_test_123456',
    ).toString('base64');
    const result = service.generateAccessToken(`Basic ${credentials}`);
    const [payload] = result.access_token.split('.');

    expect(() => service.validateAccessToken(`${payload}.tampered`)).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject expired access token', () => {
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'aims_vietqr_test',
        nonce: 'expired-token-test',
        exp: Math.floor(Date.now() / 1000) - 1,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('base64url');

    expect(() => service.validateAccessToken(`${payload}.${signature}`)).toThrow(
      UnauthorizedException,
    );
  });
});
