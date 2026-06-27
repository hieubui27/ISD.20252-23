import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../constants/payment.constants';

/**
 * Helper: PaymentTransactionStatusHelper
 *
 * SOLID Review:
 * SRP: Satisfied. The helper validates payment transaction status transitions.
 * OCP: Satisfied. New rules can be added as separate helper functions.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Each function checks one transition rule.
 * DIP: Satisfied. Services use these helpers instead of duplicating status checks.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The helper receives primitive status values and all functions protect
 *   PaymentTransaction state changes.
 */
export function ensureCanMarkSuccess(status: string): void {
  if (status !== PaymentStatus.PENDING) {
    throw new BadRequestException(
      `Cannot mark transaction success from ${status}`,
    );
  }
}

export function ensureCanMarkFailed(status: string): void {
  if (status !== PaymentStatus.PENDING) {
    throw new BadRequestException(
      `Cannot mark transaction failed from ${status}`,
    );
  }
}

export function ensureCanMarkRefundRequired(status: string): void {
  if (status !== PaymentStatus.SUCCESS) {
    throw new BadRequestException(
      `Cannot mark transaction refund required from ${status}`,
    );
  }
}

export function convertMoneyToUSD(amount: number): number {
  const conversionRate = 26000;
  return parseFloat((amount / conversionRate).toFixed(2));
}
