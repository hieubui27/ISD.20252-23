import { Controller, Headers, Post } from '@nestjs/common';
import { VietqrInboundService } from './vietqr-inbound.service';

/**
 * Controller: VietqrInboundController
 *
 * SOLID Review:
 * SRP: Satisfied. It exposes the inbound token endpoint for VietQR connection tests.
 * OCP: Satisfied. Token creation details stay inside VietqrInboundService.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. The controller has one focused endpoint.
 * DIP: Satisfied. It depends on VietqrInboundService instead of token logic directly.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes the Authorization header to the inbound service and keeps
 *   inbound VietQR authentication in one controller.
 */
@Controller('vqr/api')
export class VietqrInboundController {
  constructor(private readonly vietqrInboundService: VietqrInboundService) {}

  @Post('token_generate')
  generateAccessToken(@Headers('authorization') authorization?: string) {
    return this.vietqrInboundService.generateAccessToken(authorization);
  }
}
