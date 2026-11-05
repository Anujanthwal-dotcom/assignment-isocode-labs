import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceEvaluatorService } from './compliance-evaluator.service';
import { ComplianceRuleService } from './compliance-rule.service';
import { PrismaService } from '../prisma/prisma.service';
import { MedicineSchedule, CompliancePolicyAction } from '@prisma/client';

describe('ComplianceEvaluatorService (Deterministic Engine)', () => {
  let service: ComplianceEvaluatorService;
  let mockRuleService: any;
  let mockPrisma: any;

  const mockActiveRuleSet = {
    id: 'ruleset-uuid-1',
    version: '1.0.0',
    name: 'Standard Operational Pharmacy Policy',
    rules: [
      {
        id: 'r-1',
        medicineSchedule: MedicineSchedule.OTC,
        policyAction: CompliancePolicyAction.ALLOW_WITH_REVIEW,
        requiresPrescription: false,
        requiresPharmacistApproval: true,
        requiresH1Register: false,
        hardBlocked: false,
      },
      {
        id: 'r-2',
        medicineSchedule: MedicineSchedule.SCHEDULE_H,
        policyAction: CompliancePolicyAction.REQUIRE_PRESCRIPTION_AND_APPROVAL,
        requiresPrescription: true,
        requiresPharmacistApproval: true,
        requiresH1Register: false,
        hardBlocked: false,
      },
      {
        id: 'r-3',
        medicineSchedule: MedicineSchedule.SCHEDULE_H1,
        policyAction: CompliancePolicyAction.REQUIRE_H1_REGISTER,
        requiresPrescription: true,
        requiresPharmacistApproval: true,
        requiresH1Register: true,
        hardBlocked: false,
      },
      {
        id: 'r-4',
        medicineSchedule: MedicineSchedule.SCHEDULE_X,
        policyAction: CompliancePolicyAction.HARD_BLOCK,
        requiresPrescription: true,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: true,
        description: 'Schedule X hard blocked',
      },
      {
        id: 'r-5',
        medicineSchedule: MedicineSchedule.NARCOTIC,
        policyAction: CompliancePolicyAction.HARD_BLOCK,
        requiresPrescription: true,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: true,
        description: 'Narcotics hard blocked',
      },
      {
        id: 'r-6',
        medicineSchedule: MedicineSchedule.UNKNOWN,
        policyAction: CompliancePolicyAction.FAIL_CLOSED,
        requiresPrescription: false,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: false,
      },
    ],
  };

  beforeEach(() => {
    mockRuleService = {
      getActiveRuleSet: vi.fn().mockResolvedValue(mockActiveRuleSet),
    };
    mockPrisma = {
      complianceRuleSet: {
        findUnique: vi.fn(),
      },
    };

    service = new ComplianceEvaluatorService(
      mockRuleService as unknown as ComplianceRuleService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('1. OTC item requires pharmacist review for every item (canApprove: true, ALLOWED_FOR_REVIEW)', async () => {
    const result = await service.evaluate({
      medicineId: 'med-otc-1',
      schedule: MedicineSchedule.OTC,
      hasPrescription: false,
    });

    expect(result.decision).toBe('ALLOWED_FOR_REVIEW');
    expect(result.canApprove).toBe(true);
    expect(result.reasons[0]).toContain('OTC medicine eligible for review');
    expect(result.ruleVersionId).toBe(mockActiveRuleSet.id);
  });

  it('2. Schedule H item without prescription is blocked from approval (canApprove: false, REQUIRES_PRESCRIPTION)', async () => {
    const result = await service.evaluate({
      medicineId: 'med-h-1',
      schedule: MedicineSchedule.SCHEDULE_H,
      hasPrescription: false,
    });

    expect(result.decision).toBe('REQUIRES_PRESCRIPTION');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('requires a valid uploaded prescription');
  });

  it('3. Schedule H item with prescription requires pharmacist approval (canApprove: true, REQUIRES_PHARMACIST_APPROVAL)', async () => {
    const result = await service.evaluate({
      medicineId: 'med-h-1',
      schedule: MedicineSchedule.SCHEDULE_H,
      hasPrescription: true,
    });

    expect(result.decision).toBe('REQUIRES_PHARMACIST_APPROVAL');
    expect(result.canApprove).toBe(true);
    expect(result.reasons[0]).toContain('Explicit pharmacist approval required');
  });

  it('4. Schedule H1 item without prescription is blocked from approval (canApprove: false, REQUIRES_PRESCRIPTION)', async () => {
    const result = await service.evaluate({
      medicineId: 'med-h1-1',
      schedule: MedicineSchedule.SCHEDULE_H1,
      hasPrescription: false,
    });

    expect(result.decision).toBe('REQUIRES_PRESCRIPTION');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('requires a valid uploaded prescription');
  });

  it('5. Schedule H1 item with prescription but missing H1 register details cannot be approved (canApprove: false, REQUIRES_H1_REGISTER)', async () => {
    const result = await service.evaluate({
      medicineId: 'med-h1-1',
      schedule: MedicineSchedule.SCHEDULE_H1,
      hasPrescription: true,
      hasH1RegisterDetails: false,
    });

    expect(result.decision).toBe('REQUIRES_H1_REGISTER');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('H1 register information');
  });

  it('6. Schedule H1 item with prescription and H1 register details can be approved by pharmacist', async () => {
    const result = await service.evaluate({
      medicineId: 'med-h1-1',
      schedule: MedicineSchedule.SCHEDULE_H1,
      hasPrescription: true,
      hasH1RegisterDetails: true,
    });

    expect(result.decision).toBe('REQUIRES_PHARMACIST_APPROVAL');
    expect(result.canApprove).toBe(true);
    expect(result.reasons[0]).toContain('H1 register details verified');
  });

  it('7. Schedule X item is hard blocked and cannot be approved', async () => {
    const result = await service.evaluate({
      medicineId: 'med-x-1',
      schedule: MedicineSchedule.SCHEDULE_X,
      hasPrescription: true,
    });

    expect(result.decision).toBe('BLOCKED');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('Schedule X substances are not permitted');
  });

  it('8. NARCOTIC item is hard blocked and cannot be approved', async () => {
    const result = await service.evaluate({
      medicineId: 'med-narcotic-1',
      schedule: MedicineSchedule.NARCOTIC,
      hasPrescription: true,
    });

    expect(result.decision).toBe('BLOCKED');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('Narcotic drugs are hard-blocked');
  });

  it('9. UNKNOWN classification fails closed and cannot be approved', async () => {
    const result = await service.evaluate({
      medicineId: 'med-unk-1',
      schedule: MedicineSchedule.UNKNOWN,
      hasPrescription: true,
    });

    expect(result.decision).toBe('UNKNOWN_CLASSIFICATION');
    expect(result.canApprove).toBe(false);
    expect(result.reasons[0]).toContain('requires compliance review');
  });

  it('10. Missing active rule set fails closed (canApprove: false, UNKNOWN_CLASSIFICATION)', async () => {
    mockRuleService.getActiveRuleSet.mockResolvedValue(null);

    const result = await service.evaluate({
      medicineId: 'med-otc-1',
      schedule: MedicineSchedule.OTC,
      hasPrescription: false,
    });

    expect(result.decision).toBe('UNKNOWN_CLASSIFICATION');
    expect(result.canApprove).toBe(false);
    expect(result.ruleVersionId).toBe('NONE');
    expect(result.reasons[0]).toContain('No active compliance rule set is configured');
  });

  it('11. Compliance evaluation references the correct rule version ID', async () => {
    const result = await service.evaluate({
      medicineId: 'med-otc-1',
      schedule: MedicineSchedule.OTC,
      hasPrescription: false,
    });

    expect(result.ruleVersionId).toBe('ruleset-uuid-1');
  });

  it('12. Historical evaluation links to specified original ruleSetId', async () => {
    const historicalRuleSet = {
      id: 'historical-v0-id',
      version: '0.9.0',
      rules: mockActiveRuleSet.rules,
    };
    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue(historicalRuleSet);

    const result = await service.evaluate({
      medicineId: 'med-otc-1',
      schedule: MedicineSchedule.OTC,
      hasPrescription: false,
      ruleSetId: 'historical-v0-id',
    });

    expect(result.ruleVersionId).toBe('historical-v0-id');
    expect(mockPrisma.complianceRuleSet.findUnique).toHaveBeenCalledWith({
      where: { id: 'historical-v0-id' },
      include: { rules: true },
    });
  });
});
