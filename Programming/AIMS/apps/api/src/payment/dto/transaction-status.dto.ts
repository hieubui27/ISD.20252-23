/**
 * DTO: TransactionStatusDto
 *
 * SOLID Review:
 * SRP: Satisfied. It describes the current status of one payment transaction.
 * OCP: Satisfied. Optional fields cover provider data without changing the status contract.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. It contains only transaction status response fields.
 * DIP: Satisfied. Mappers and controllers exchange this DTO instead of provider payloads.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes primitive status data and all fields describe one transaction.
 */
export class TransactionStatusDto {
  transactionId!: string;
  status!: string;
  message!: string;
  paidAmount!: number;
}
