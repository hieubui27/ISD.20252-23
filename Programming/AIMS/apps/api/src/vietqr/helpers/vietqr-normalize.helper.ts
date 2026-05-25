const CONTENT_MAX_LENGTH = 23;
const ORDER_ID_MAX_LENGTH = 13;

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - These helpers receive only primitive text values and length limits.
 * - They do not access provider clients, payment records, services, or shared mutable state.
 *
 * Cohesion reason:
 * - All exported functions normalize VietQR content or derive VietQR-safe order identifiers.
 */
export function normalizeVietqrText(value: string, maxLength: number): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  return normalized.slice(0, maxLength);
}

export function normalizeVietqrContent(value: string): string {
  return normalizeVietqrText(value, CONTENT_MAX_LENGTH);
}

export function normalizeVietqrOrderId(value: string): string {
  return normalizeVietqrText(value, ORDER_ID_MAX_LENGTH).replace(/\s/g, '');
}

export function buildGatewayOrderId(transactionId: string): string {
  return normalizeVietqrOrderId(transactionId.replace(/-/g, '').slice(0, 13));
}
