const CONTENT_MAX_LENGTH = 23;
const ORDER_ID_MAX_LENGTH = 13;

/**
 * Helper: VietqrNormalizeHelper
 *
 * SOLID Review:
 * SRP: Satisfied. The helper only normalizes VietQR text and order references.
 * OCP: Satisfied. New normalization helpers can be added without changing callers.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Each function has a small text-normalization purpose.
 * DIP: Satisfied. Services call helper functions instead of embedding formatting rules.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The helper works with strings and keeps VietQR-safe formatting rules together.
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
