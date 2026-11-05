export const SKU_REGEX = /^[A-Za-z0-9-_]{3,64}$/;

export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export function isValidSku(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  return SKU_REGEX.test(normalizeSku(sku));
}

export function isValidMrp(mrp: number | string): boolean {
  const num = typeof mrp === 'string' ? parseFloat(mrp) : mrp;
  if (isNaN(num) || !isFinite(num)) return false;
  return num > 0;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
