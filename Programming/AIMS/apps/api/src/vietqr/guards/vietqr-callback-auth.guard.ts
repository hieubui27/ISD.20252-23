import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { VietqrConfigService } from '../config/vietqr-config.service';
import { VietqrInboundService } from '../vietqr-inbound.service';

/**
 * Guard: VietqrCallbackAuthGuard
 *
 * SOLID Review:
 * SRP: Satisfied. It only validates VietQR callback bearer tokens.
 * OCP: Satisfied. Token validation can change inside VietqrInboundService.
 * LSP: Satisfied. It follows NestJS CanActivate behavior.
 * ISP: Satisfied. The guard exposes only canActivate().
 * DIP: Satisfied. It uses VietqrInboundService and config instead of hard-coded validation.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The guard reads the auth header and config values, and all logic is
 *   about VietQR callback authentication.
 */
@Injectable()
export class VietqrCallbackAuthGuard implements CanActivate {
  constructor(
    private readonly vietqrInboundService: VietqrInboundService,
    private readonly configService: VietqrConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid VietQR callback auth header');
    }

    const receivedToken = authHeader.slice('Bearer '.length).trim();
    const staticCallbackToken = this.configService.getCallbackToken();

    if (staticCallbackToken && receivedToken === staticCallbackToken) {
      return true;
    }

    this.vietqrInboundService.validateAccessToken(receivedToken);
    return true;
  }
}
