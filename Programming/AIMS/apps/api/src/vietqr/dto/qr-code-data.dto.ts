/**
 * DTO: QRCodeDataDto
 *
 * SOLID Review:
 * SRP: Satisfied. It stores the QR result returned from VietQR generation.
 * OCP: Satisfied. Optional URL/content fields support different VietQR responses.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. It contains only QR result fields.
 * DIP: Satisfied. Payment code consumes this DTO instead of raw provider responses.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: It passes primitive QR data and all fields describe one generated QR code.
 */
export class QRCodeDataDto {
  qrCode!: string;
  qrDataUrl?: string;
  qrLink?: string;
  amount!: number;
  expiredAt?: Date;
  qrContent!: string;
  orderId!: string;
}
