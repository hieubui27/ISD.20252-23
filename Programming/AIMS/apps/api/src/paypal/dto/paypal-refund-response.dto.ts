/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO exposes only primitive PayPal refund response fields returned to the controller.
 * - It does not carry provider client instances, database records, or shared state.
 *
 * Cohesion reason:
 * - All properties describe the result of a PayPal refund operation.
 */
export class PaypalRefundResponseDto {
  id: string;
  status: string;
  amount: number;
  currencyCode: string;
}
