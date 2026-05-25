/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only primitive transaction status fields between VietQR mapping and payment responses.
 * - It has no dependency on persistence entities, controllers, or provider clients.
 *
 * Cohesion reason:
 * - All properties describe the synchronized status of one payment transaction.
 */
export class TransactionStatusDto {
  transactionId: string;
  status: string;
  message: string;
  paidAmount: number;
}
