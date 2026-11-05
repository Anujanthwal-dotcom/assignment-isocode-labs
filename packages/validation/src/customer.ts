import { normalizePhone, isValidIndianMobile } from './auth.js';
import { z } from 'zod';

export const VALID_FAMILY_RELATIONSHIPS = [
  'SELF',
  'MOTHER',
  'FATHER',
  'SPOUSE',
  'CHILD',
  'SIBLING',
  'OTHER',
] as const;

export type FamilyRelationshipType = (typeof VALID_FAMILY_RELATIONSHIPS)[number];

export function isValidFamilyRelationship(relation: string): relation is FamilyRelationshipType {
  return VALID_FAMILY_RELATIONSHIPS.includes(relation as FamilyRelationshipType);
}

/**
 * Normalizes an Indian Postal PIN code (trims and removes spaces).
 */
export function normalizePostalCode(pin: string): string {
  if (!pin) return '';
  return pin.replace(/\s+/g, '').trim();
}

/**
 * Validates 6-digit Indian PIN code (100000 - 999999).
 */
export function isValidIndianPinCode(pin: string): boolean {
  const normalized = normalizePostalCode(pin);
  return /^[1-9]\d{5}$/.test(normalized);
}

/**
 * Validates cart item quantity: positive integer between 1 and 100.
 */
export function isValidCartQuantity(quantity: number): boolean {
  return (
    typeof quantity === 'number' &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 100
  );
}

export const VALID_PAYMENT_METHODS = ['UPI', 'COD'] as const;
export type PaymentMethodType = (typeof VALID_PAYMENT_METHODS)[number];

export function isValidPaymentMethod(method: string): method is PaymentMethodType {
  return VALID_PAYMENT_METHODS.includes(method as PaymentMethodType);
}

export const VALID_MOCK_PAYMENT_RESULTS = ['SUCCESS', 'FAILURE'] as const;
export type MockPaymentResultType = (typeof VALID_MOCK_PAYMENT_RESULTS)[number];

export function isValidMockPaymentResult(result: string): result is MockPaymentResultType {
  return VALID_MOCK_PAYMENT_RESULTS.includes(result as MockPaymentResultType);
}

/**
 * Helper to generate order numbers in format PH-YYYYMMDD-XXXXXX
 */
export function formatOrderNumber(dateKey: string, seq: number): string {
  const sequenceStr = seq.toString().padStart(6, '0');
  return `PH-${dateKey}-${sequenceStr}`;
}

export { normalizePhone, isValidIndianMobile };

// ==========================================
// Phase 4: AI Extraction Zod Schemas
// ==========================================

export const ExtractedPrescriptionItemZodSchema = z.object({
  rawMedicineName: z.string().min(1, 'Raw medicine name is required'),
  normalizedMedicineName: z.string().nullable().default(null),
  strength: z.string().nullable().default(null),
  dosageForm: z.string().nullable().default(null),
  dosageInstructions: z.string().nullable().default(null),
  frequency: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .nullable()
    .default(null),
  confidence: z
    .number()
    .min(0, 'Confidence must be at least 0')
    .max(1, 'Confidence must be at most 1'),
  sourceText: z.string().nullable().default(null),
  warnings: z.array(z.string()).default([]),
});

export const PrescriptionExtractionResultZodSchema = z.object({
  documentReadable: z.boolean(),
  overallConfidence: z
    .number()
    .min(0, 'Confidence must be at least 0')
    .max(1, 'Confidence must be at most 1'),
  patientName: z.string().nullable().default(null),
  prescriberName: z.string().nullable().default(null),
  prescriptionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Prescription date must be ISO YYYY-MM-DD or null')
    .nullable()
    .default(null),
  items: z.array(ExtractedPrescriptionItemZodSchema).default([]),
  unreadableSections: z.array(z.string()).default([]),
  generalWarnings: z.array(z.string()).default([]),
});

export type ExtractedPrescriptionItemValidated = z.infer<
  typeof ExtractedPrescriptionItemZodSchema
>;
export type PrescriptionExtractionResultValidated = z.infer<
  typeof PrescriptionExtractionResultZodSchema
>;

export function validatePrescriptionExtraction(data: unknown): {
  valid: boolean;
  data?: PrescriptionExtractionResultValidated;
  errors: string[];
} {
  const result = PrescriptionExtractionResultZodSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return {
    valid: true,
    data: result.data,
    errors: [],
  };
}


