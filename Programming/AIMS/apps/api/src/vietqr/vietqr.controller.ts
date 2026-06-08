import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { VietqrTestCallbackDto } from './dto/vietqr-test-callback.dto';
import { VietqrCallbackAuthGuard } from './guards/vietqr-callback-auth.guard';
import { VietqrService } from './vietqr.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This controller depends only on VietqrService, PaymentService, VietQR DTOs, and the callback token guard.
 * - It does not query the database or call VietQR HTTP APIs directly.
 *
 * Cohesion reason:
 * - All methods expose VietQR-specific endpoints for callback synchronization, QR generation, and sandbox callback testing.
 */
@Controller()
/**
 * SOLID review:
 * - SRP: Low risk. The controller remains within the VietQR boundary, but it mixes
 *   production QR/callback endpoints with sandbox callback testing.
 * - OCP: Partial violation for sandbox behavior. Production hardening currently
 *   requires modifying this controller instead of enabling/disabling a separate
 *   test-only module.
 * - Improvement: Split sandbox endpoints into a VietqrSandboxController registered
 *   only in non-production environments. Keep this controller for production
 *   callback and QR endpoints only.
 */
export class VietqrController {
  constructor(
    private readonly vietqrService: VietqrService,
    private readonly paymentService: PaymentService,
  ) {}

  @UseGuards(VietqrCallbackAuthGuard)
  @Post('vqr/bank/api/transaction-sync')
  async syncTransaction(@Body() transactionSyncDto: TransactionSyncDto) {
    try {
      const result =
        await this.paymentService.confirmTransactionFromVietqrCallback(
          transactionSyncDto,
        );

      return this.vietqrService.buildCallbackSuccessResponse(
        result.refTransactionId,
        result.duplicate
          ? 'Transaction already processed'
          : 'Transaction processed successfully',
      );
    } catch (error) {
      return this.vietqrService.buildCallbackErrorResponse(
        error?.response?.error || error?.name || 'TRANSACTION_SYNC_FAILED',
        error?.message || 'Transaction sync failed',
      );
    }
  }

  @Post('payments/vietqr/test-callback')
  testCallback(@Body() vietqrTestCallbackDto: VietqrTestCallbackDto) {
    return this.vietqrService.testCallback(vietqrTestCallbackDto);
  }
}
