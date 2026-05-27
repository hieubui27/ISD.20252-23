/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO exposes only primitive PayPal capture response fields returned to the controller.
 * - It does not carry provider client instances, database records, or shared state.
 *
 * Cohesion reason:
 * - All properties describe the result of a PayPal payment capture.
 */
export class PaypalCaptureResponseDto {
  id: string;
  status: string;
  captureId: string;
  payerEmail: string;
  amount: number;
  currencyCode: string;
}
