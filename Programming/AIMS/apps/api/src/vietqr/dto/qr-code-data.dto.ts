/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO carries only primitive QR code result fields from VietqrService to payment callers.
 * - It does not contain provider client objects, persistence entities, or mutable global state.
 *
 * Cohesion reason:
 * - All properties describe the result of one generated VietQR code.
 */
export class QRCodeDataDto {
  qrCode: string;
  qrDataUrl?: string;
  qrLink?: string;
  amount: number;
  expiredAt?: Date;
  qrContent?: string;
  orderId?: string;
}
