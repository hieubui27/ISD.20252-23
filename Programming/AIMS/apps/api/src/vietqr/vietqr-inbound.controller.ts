import { Controller, Headers, Post } from '@nestjs/common';
import { VietqrInboundService } from './vietqr-inbound.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This controller depends only on VietqrInboundService and passes the primitive Authorization header.
 * - It does not access payment records, outbound VietQR client internals, or shared mutable state.
 *
 * Cohesion reason:
 * - Its endpoint exposes the inbound VietQR token generation boundary used for merchant connection testing.
 */
@Controller('vqr/api')
export class VietqrInboundController {
  constructor(private readonly vietqrInboundService: VietqrInboundService) {}

  @Post('token_generate')
  generateAccessToken(@Headers('authorization') authorization?: string) {
    return this.vietqrInboundService.generateAccessToken(authorization);
  }
}
