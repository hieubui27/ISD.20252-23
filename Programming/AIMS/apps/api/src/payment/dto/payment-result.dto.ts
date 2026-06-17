/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO exposes only primitive response fields returned by payment APIs.
 * - It does not carry provider client instances, database records, or shared state.
 *
 * Cohesion reason:
 * - All properties describe the result of a payment operation returned to callers.
 */
export class PaymentResultDto {
  success!: boolean;
  status!: string;
  paymentMethod!: string;
  paymentUrl!: string;
  qrCode!: string;
  transactionId!: string;
  message!: string;
}
