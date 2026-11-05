import { z } from 'zod';

export const compliancePolicyActionSchema = z.enum([
  'ALLOW_WITH_REVIEW',
  'REQUIRE_PRESCRIPTION_AND_APPROVAL',
  'REQUIRE_H1_REGISTER',
  'HARD_BLOCK',
  'FAIL_CLOSED',
]);

export const complianceRuleSetStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'SUPERSEDED']);

export const complianceRuleItemSchema = z.object({
  medicineSchedule: z.string().min(1, 'Medicine schedule is required'),
  policyAction: compliancePolicyActionSchema,
  requiresPrescription: z.boolean().default(false),
  requiresPharmacistApproval: z.boolean().default(true),
  requiresH1Register: z.boolean().default(false),
  hardBlocked: z.boolean().default(false),
  description: z.string().max(500).optional().nullable(),
});

export const createComplianceRuleSetSchema = z.object({
  version: z
    .string()
    .min(1, 'Version is required')
    .regex(/^v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/, 'Version must be semver formatted (e.g. 1.0.0)'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional().nullable(),
  rules: z.array(complianceRuleItemSchema).optional(),
});

export const activateComplianceRuleSetSchema = z.object({
  reason: z.string().min(5, 'Activation reason must be at least 5 characters').max(500),
});

export const updateComplianceRuleSchema = z.object({
  policyAction: compliancePolicyActionSchema.optional(),
  requiresPrescription: z.boolean().optional(),
  requiresPharmacistApproval: z.boolean().optional(),
  requiresH1Register: z.boolean().optional(),
  hardBlocked: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
});
