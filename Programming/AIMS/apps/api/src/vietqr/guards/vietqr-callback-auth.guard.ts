import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This guard reads only the callback authorization header and the configured callback token.
 * - It does not query orders, payment transactions, user roles, or provider HTTP APIs.
 *
 * Cohesion reason:
 * - Its single responsibility is validating VietQR callback bearer-token authentication.
 */
@Injectable()
export class VietqrCallbackAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const expectedToken = process.env.VIETQR_CALLBACK_TOKEN;

    // TODO(VIETQR_API_INTEGRATION): Replace sandbox token with the token configured in VietQR merchant portal.
    if (!expectedToken) {
      throw new UnauthorizedException(
        'VietQR callback token is not configured',
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid VietQR callback auth header');
    }

    const receivedToken = authHeader.slice('Bearer '.length).trim();
    if (receivedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid VietQR callback token');
    }

    return true;
  }
}
