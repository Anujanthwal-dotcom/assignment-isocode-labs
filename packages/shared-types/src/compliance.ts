export type ComplianceDecision =
  | 'ALLOWED_FOR_REVIEW'
  | 'REQUIRES_PRESCRIPTION'
  | 'REQUIRES_PHARMACIST_APPROVAL'
  | 'REQUIRES_H1_REGISTER'
  | 'BLOCKED'
  | 'UNKNOWN_CLASSIFICATION';

export type ComplianceRuleSetStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';

export type CompliancePolicyAction =
  | 'ALLOW_WITH_REVIEW'
  | 'REQUIRE_PRESCRIPTION_AND_APPROVAL'
  | 'REQUIRE_H1_REGISTER'
  | 'HARD_BLOCK'
  | 'FAIL_CLOSED';

export interface ComplianceEvaluationResult {
  medicineId: string;
  schedule: string;
  decision: ComplianceDecision;
  canApprove: boolean;
  reasons: string[];
  ruleVersionId: string;
  evaluatedAt: string;
}

export interface ComplianceRuleDTO {
  id: string;
  ruleSetId: string;
  medicineSchedule: string;
  policyAction: CompliancePolicyAction;
  requiresPrescription: boolean;
  requiresPharmacistApproval: boolean;
  requiresH1Register: boolean;
  hardBlocked: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRuleSetDTO {
  id: string;
  version: string;
  name: string;
  description?: string | null;
  status: ComplianceRuleSetStatus;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  createdByUserId: string;
  createdByUser?: {
    id: string;
    email?: string | null;
  } | null;
  activatedByUserId?: string | null;
  activationReason?: string | null;
  rules: ComplianceRuleDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplianceRuleSetDTO {
  version: string;
  name: string;
  description?: string;
  rules?: Array<{
    medicineSchedule: string;
    policyAction: CompliancePolicyAction;
    requiresPrescription?: boolean;
    requiresPharmacistApproval?: boolean;
    requiresH1Register?: boolean;
    hardBlocked?: boolean;
    description?: string;
  }>;
}

export interface ActivateComplianceRuleSetDTO {
  reason: string;
}

export interface ComplianceDecisionHistoryItemDTO {
  id: string;
  orderItemId: string;
  orderNumber: string;
  medicineName: string;
  schedule: string;
  decision: ComplianceDecision;
  canApprove: boolean;
  reasons: string[];
  ruleVersion: string;
  evaluatedAt: string;
}
