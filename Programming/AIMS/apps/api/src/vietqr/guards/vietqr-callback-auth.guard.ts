import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { VietqrInboundService } from '../vietqr-inbound.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This guard reads only the callback authorization header, static test token, and issued inbound token validator.
 * - It does not query orders, payment transactions, user roles, or provider HTTP APIs.
 *
 * Cohesion reason:
 * - Its single responsibility is validating VietQR callback bearer-token authentication.
 */
@Injectable()
export class VietqrCallbackAuthGuard implements CanActivate {
  constructor(private readonly vietqrInboundService: VietqrInboundService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid VietQR callback auth header');
    }

    const receivedToken = authHeader.slice('Bearer '.length).trim();
    const staticCallbackToken = process.env.VIETQR_CALLBACK_TOKEN;

    if (staticCallbackToken && receivedToken === staticCallbackToken) {
      return true;
    }

    this.vietqrInboundService.validateAccessToken(receivedToken);
    return true;
  }
}
