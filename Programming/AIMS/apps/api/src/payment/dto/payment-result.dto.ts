/**
 * DTO: PaymentResultDto
 *
 * SOLID Review:
 * SRP: Satisfied. It represents the response of a payment operation.
 * OCP: Satisfied. Optional URL and QR fields support different providers.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. The DTO contains only response fields needed by callers.
 * DIP: Satisfied. Payment APIs return this DTO instead of provider-specific objects.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It carries primitive response data and keeps provider output in a
 *   common payment shape.
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
