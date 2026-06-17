import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { VietqrTestCallbackDto } from './dto/vietqr-test-callback.dto';
import { VietqrCallbackAuthGuard } from './guards/vietqr-callback-auth.guard';
import { VietqrCallbackResponseMapper } from './mappers/vietqr-callback-response.mapper';
import { VietqrCallbackService } from './vietqr-callback.service';
import { VietqrSandboxService } from './vietqr-sandbox.service';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This controller depends only on VietqrService, VietqrCallbackService, VietQR DTOs, and the callback token guard.
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
    private readonly vietqrCallbackService: VietqrCallbackService,
    private readonly responseMapper: VietqrCallbackResponseMapper,
    private readonly sandboxService: VietqrSandboxService,
  ) {}

  @UseGuards(VietqrCallbackAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('vqr/bank/api/transaction-sync')
  async syncTransaction(@Body() transactionSyncDto: TransactionSyncDto) {
    try {
      const result =
        await this.vietqrCallbackService.confirmTransactionFromCallback(
          transactionSyncDto,
        );

      return this.responseMapper.success(
        result.refTransactionId,
        result.duplicate
          ? 'Transaction already processed'
          : 'Transaction processed successfully',
      );
    } catch (error) {
      const responseError = this.getResponseError(error);
      const message = error instanceof Error ? error.message : undefined;

      return this.responseMapper.error(
        responseError || 'TRANSACTION_SYNC_FAILED',
        message || 'Transaction sync failed',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('payments/vietqr/test-callback')
  testCallback(@Body() vietqrTestCallbackDto: VietqrTestCallbackDto) {
    return this.sandboxService.testCallback(vietqrTestCallbackDto);
  }

  private getResponseError(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      const response = (error as { response?: unknown }).response;
      if (response && typeof response === 'object') {
        const responseError = (response as { error?: unknown }).error;
        if (typeof responseError === 'string') {
          return responseError;
        }
      }
    }

    return error instanceof Error && error.name ? error.name : undefined;
  }
}
