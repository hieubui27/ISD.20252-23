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
 * Controller: VietqrController
 *
 * SOLID Review:
 * SRP: Acceptable. It handles VietQR callback and sandbox test endpoints.
 * OCP: Acceptable for the current scope. Sandbox behavior can be split later if needed.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Each endpoint receives a focused DTO.
 * DIP: Satisfied. The controller delegates work to services and a response mapper.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The controller passes VietQR DTOs to VietQR services and keeps
 *   VietQR HTTP endpoints together.
 */
@Controller()
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
