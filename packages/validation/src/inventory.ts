import { isValidSku, normalizeSku } from './catalogue.js';

export interface CsvParsedRow {
  rowNumber: number;
  sku: string;
  quantity: number;
  reorderLevel: number;
}

export interface CsvRowValidationResult {
  valid: boolean;
  rowNumber: number;
  sku?: string;
  quantity?: number;
  reorderLevel?: number;
  errorMessage?: string;
}

export function validateCsvRow(
  raw: { sku?: unknown; quantity?: unknown; reorderLevel?: unknown },
  rowNumber: number,
): CsvRowValidationResult {
  const rawSku = raw.sku !== undefined && raw.sku !== null ? String(raw.sku).trim() : '';
  const rawQty = raw.quantity !== undefined && raw.quantity !== null ? String(raw.quantity).trim() : '';
  const rawReorder =
    raw.reorderLevel !== undefined && raw.reorderLevel !== null
      ? String(raw.reorderLevel).trim()
      : '';

  if (!rawSku) {
    return {
      valid: false,
      rowNumber,
      errorMessage: `Row ${rowNumber}: SKU is required.`,
    };
  }

  const sku = normalizeSku(rawSku);
  if (!isValidSku(sku)) {
    return {
      valid: false,
      rowNumber,
      sku,
      errorMessage: `Row ${rowNumber}: Invalid SKU format '${rawSku}'. Must be 3-64 alphanumeric characters or hyphens.`,
    };
  }

  // Validate Quantity - must be non-negative integer (reject decimals and negatives)
  if (!rawQty || !/^\d+$/.test(rawQty)) {
    return {
      valid: false,
      rowNumber,
      sku,
      errorMessage: `Row ${rowNumber}: Quantity must be a non-negative integer, received '${rawQty}'.`,
    };
  }
  const quantity = parseInt(rawQty, 10);

  // Validate Reorder Level - must be non-negative integer (reject decimals and negatives)
  if (!rawReorder || !/^\d+$/.test(rawReorder)) {
    return {
      valid: false,
      rowNumber,
      sku,
      errorMessage: `Row ${rowNumber}: Reorder level must be a non-negative integer, received '${rawReorder}'.`,
    };
  }
  const reorderLevel = parseInt(rawReorder, 10);

  return {
    valid: true,
    rowNumber,
    sku,
    quantity,
    reorderLevel,
  };
}
