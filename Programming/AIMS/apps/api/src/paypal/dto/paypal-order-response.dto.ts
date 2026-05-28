/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This DTO exposes only primitive PayPal order response fields returned to the controller.
 * - It does not carry provider client instances, database records, or shared state.
 *
 * Cohesion reason:
 * - All properties describe the result of a PayPal order creation.
 */
export class PaypalLinkDto {
  href: string;
  rel: string;
  method: string;
}

export class PaypalOrderResponseDto {
  id: string;
  status: string;
  approvalUrl: string;
  links: PaypalLinkDto[];
}
