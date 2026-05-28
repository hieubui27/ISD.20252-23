import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../constants/payment.constants';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - These helpers receive only primitive status values and compare them with payment status constants.
 * - They do not access services, database records, provider clients, or shared mutable state.
 *
 * Cohesion reason:
 * - All exported functions validate allowed payment transaction status transitions.
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
