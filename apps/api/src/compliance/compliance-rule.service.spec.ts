import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceRuleService } from './compliance-rule.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceRuleSetStatus, MedicineSchedule } from '@prisma/client';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('ComplianceRuleService', () => {
  let service: ComplianceRuleService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      complianceRuleSet: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      complianceRule: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };
    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new ComplianceRuleService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  it('prevents creating duplicate semver versions', async () => {
    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue({
      id: 'exists-id',
      version: '1.0.0',
    });

    await expect(
      service.createRuleSet({ version: '1.0.0', name: 'Duplicate Version' }, 'user-admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('creates draft rule set with full schedule coverage', async () => {
    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue(null);
    mockPrisma.complianceRuleSet.create.mockResolvedValue({
      id: 'new-id',
      version: '1.1.0',
      name: 'New Draft',
      status: ComplianceRuleSetStatus.DRAFT,
      rules: [{ id: 'r1' }],
    });

    const res = await service.createRuleSet(
      { version: '1.1.0', name: 'New Draft' },
      'user-admin-1',
    );

    expect(res.id).toBe('new-id');
    expect(mockPrisma.complianceRuleSet.create).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMPLIANCE_RULE_SET_CREATED' }),
    );
  });

  it('rejects in-place edits on ACTIVE rule sets', async () => {
    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue({
      id: 'active-id',
      version: '1.0.0',
      status: ComplianceRuleSetStatus.ACTIVE,
      rules: [],
    });

    await expect(
      service.updateDraftRule('active-id', 'rule-1', { hardBlocked: true }, 'user-admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects activation of a SUPERSEDED rule set', async () => {
    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue({
      id: 'old-id',
      version: '0.9.0',
      status: ComplianceRuleSetStatus.SUPERSEDED,
      rules: [],
    });

    await expect(
      service.activateRuleSet('old-id', 'user-admin-1', { reason: 'Activating old version' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('supersedes currently active rule set and activates new draft transactionally', async () => {
    const draftRules = Object.values(MedicineSchedule).map((s) => ({
      id: `r-${s}`,
      medicineSchedule: s,
    }));

    mockPrisma.complianceRuleSet.findUnique.mockResolvedValue({
      id: 'draft-id',
      version: '1.2.0',
      status: ComplianceRuleSetStatus.DRAFT,
      rules: draftRules,
    });

    mockPrisma.complianceRuleSet.update.mockResolvedValue({
      id: 'draft-id',
      version: '1.2.0',
      status: ComplianceRuleSetStatus.ACTIVE,
      rules: draftRules,
    });

    const result = await service.activateRuleSet('draft-id', 'user-compliance-admin', {
      reason: 'Mandatory annual regulatory compliance update',
    });

    expect(result.status).toBe(ComplianceRuleSetStatus.ACTIVE);
    expect(mockPrisma.complianceRuleSet.updateMany).toHaveBeenCalledWith({
      where: { status: ComplianceRuleSetStatus.ACTIVE },
      data: expect.objectContaining({ status: ComplianceRuleSetStatus.SUPERSEDED }),
    });
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMPLIANCE_RULE_SET_ACTIVATED' }),
    );
  });
});
