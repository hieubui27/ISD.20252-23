const REFERENCE_MAX_LENGTH = 13;

function normalizePaymentReference(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, REFERENCE_MAX_LENGTH)
    .replace(/\s/g, '');
}

export function buildPaymentGatewayOrderId(transactionId: string): string {
  return normalizePaymentReference(transactionId.replace(/-/g, '').slice(0, 13));
}
