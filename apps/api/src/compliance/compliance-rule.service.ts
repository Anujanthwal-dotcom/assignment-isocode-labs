import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceRuleSetStatus, MedicineSchedule, CompliancePolicyAction } from '@prisma/client';
import {
  CreateComplianceRuleSetDto,
  UpdateComplianceRuleDto,
  ActivateComplianceRuleSetDto,
} from './compliance.dto';

@Injectable()
export class ComplianceRuleService {
  private readonly logger = new Logger(ComplianceRuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getActiveRuleSet() {
    const now = new Date();
    const active = await this.prisma.complianceRuleSet.findFirst({
      where: {
        status: ComplianceRuleSetStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      include: {
        rules: true,
        createdByUser: { select: { id: true, email: true } },
        activatedByUser: { select: { id: true, email: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return active;
  }

  async getAllRuleSets() {
    return this.prisma.complianceRuleSet.findMany({
      include: {
        rules: true,
        createdByUser: { select: { id: true, email: true } },
        activatedByUser: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRuleSetById(id: string) {
    const ruleSet = await this.prisma.complianceRuleSet.findUnique({
      where: { id },
      include: {
        rules: true,
        createdByUser: { select: { id: true, email: true } },
        activatedByUser: { select: { id: true, email: true } },
      },
    });

    if (!ruleSet) {
      throw new NotFoundException(`Compliance rule set with ID '${id}' not found.`);
    }

    return ruleSet;
  }

  async createRuleSet(dto: CreateComplianceRuleSetDto, userId: string) {
    // 1. Check version uniqueness
    const existing = await this.prisma.complianceRuleSet.findUnique({
      where: { version: dto.version },
    });

    if (existing) {
      throw new ConflictException(`Compliance rule set version '${dto.version}' already exists.`);
    }

    // Default policy mapping if not all rules provided
    const defaultRules: Record<
      MedicineSchedule,
      {
        policyAction: CompliancePolicyAction;
        requiresPrescription: boolean;
        requiresPharmacistApproval: boolean;
        requiresH1Register: boolean;
        hardBlocked: boolean;
        description: string;
      }
    > = {
      [MedicineSchedule.OTC]: {
        policyAction: CompliancePolicyAction.ALLOW_WITH_REVIEW,
        requiresPrescription: false,
        requiresPharmacistApproval: true,
        requiresH1Register: false,
        hardBlocked: false,
        description: 'OTC medicines require explicit pharmacist review for every medicine item.',
      },
      [MedicineSchedule.SCHEDULE_H]: {
        policyAction: CompliancePolicyAction.REQUIRE_PRESCRIPTION_AND_APPROVAL,
        requiresPrescription: true,
        requiresPharmacistApproval: true,
        requiresH1Register: false,
        hardBlocked: false,
        description:
          'Schedule H medicines require valid prescription and explicit pharmacist approval.',
      },
      [MedicineSchedule.SCHEDULE_H1]: {
        policyAction: CompliancePolicyAction.REQUIRE_H1_REGISTER,
        requiresPrescription: true,
        requiresPharmacistApproval: true,
        requiresH1Register: true,
        hardBlocked: false,
        description:
          'Schedule H1 medicines require valid prescription, pharmacist approval, and H1 register recording.',
      },
      [MedicineSchedule.SCHEDULE_X]: {
        policyAction: CompliancePolicyAction.HARD_BLOCK,
        requiresPrescription: true,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: true,
        description:
          'Schedule X substances are hard-blocked from dispensing under the assignment policy.',
      },
      [MedicineSchedule.NARCOTIC]: {
        policyAction: CompliancePolicyAction.HARD_BLOCK,
        requiresPrescription: true,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: true,
        description: 'Narcotic drugs are hard-blocked from dispensing under the assignment policy.',
      },
      [MedicineSchedule.UNKNOWN]: {
        policyAction: CompliancePolicyAction.FAIL_CLOSED,
        requiresPrescription: false,
        requiresPharmacistApproval: false,
        requiresH1Register: false,
        hardBlocked: false,
        description:
          'Unclassified medicines fail closed and cannot be approved until classified by compliance admin.',
      },
    };

    const rulesToCreate = Object.values(MedicineSchedule).map((schedule) => {
      const customRule = dto.rules?.find((r) => r.medicineSchedule === schedule);
      const defaults = defaultRules[schedule];
      return {
        medicineSchedule: schedule,
        policyAction: customRule?.policyAction ?? defaults.policyAction,
        requiresPrescription: customRule?.requiresPrescription ?? defaults.requiresPrescription,
        requiresPharmacistApproval:
          customRule?.requiresPharmacistApproval ?? defaults.requiresPharmacistApproval,
        requiresH1Register: customRule?.requiresH1Register ?? defaults.requiresH1Register,
        hardBlocked: customRule?.hardBlocked ?? defaults.hardBlocked,
        description: customRule?.description ?? defaults.description,
      };
    });

    const created = await this.prisma.complianceRuleSet.create({
      data: {
        version: dto.version,
        name: dto.name,
        description: dto.description,
        status: ComplianceRuleSetStatus.DRAFT,
        createdByUserId: userId,
        rules: {
          create: rulesToCreate,
        },
      },
      include: {
        rules: true,
        createdByUser: { select: { id: true, email: true } },
      },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'COMPLIANCE_RULE_SET_CREATED',
      resourceType: 'ComplianceRuleSet',
      resourceId: created.id,
      metadata: {
        version: created.version,
        name: created.name,
        rulesCount: created.rules.length,
      },
    });

    return created;
  }

  async updateDraftRule(
    ruleSetId: string,
    ruleId: string,
    dto: UpdateComplianceRuleDto,
    userId: string,
  ) {
    const ruleSet = await this.getRuleSetById(ruleSetId);

    // Invariant: Active or superseded rule sets must not be edited in place
    if (ruleSet.status !== ComplianceRuleSetStatus.DRAFT) {
      throw new ConflictException(
        `Cannot modify rule set in '${ruleSet.status}' status. Create a new draft version instead.`,
      );
    }

    const rule = await this.prisma.complianceRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.ruleSetId !== ruleSetId) {
      throw new NotFoundException(
        `Compliance rule with ID '${ruleId}' not found in this rule set.`,
      );
    }

    const updated = await this.prisma.complianceRule.update({
      where: { id: ruleId },
      data: {
        policyAction: dto.policyAction,
        requiresPrescription: dto.requiresPrescription,
        requiresPharmacistApproval: dto.requiresPharmacistApproval,
        requiresH1Register: dto.requiresH1Register,
        hardBlocked: dto.hardBlocked,
        description: dto.description,
      },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'COMPLIANCE_RULE_UPDATED',
      resourceType: 'ComplianceRule',
      resourceId: ruleId,
      metadata: {
        ruleSetId,
        schedule: rule.medicineSchedule,
        previousAction: rule.policyAction,
        newAction: updated.policyAction,
      },
    });

    return updated;
  }

  async activateRuleSet(ruleSetId: string, userId: string, dto: ActivateComplianceRuleSetDto) {
    const ruleSet = await this.getRuleSetById(ruleSetId);

    if (ruleSet.status === ComplianceRuleSetStatus.SUPERSEDED) {
      throw new BadRequestException('Cannot activate a superseded compliance rule set.');
    }

    if (ruleSet.status === ComplianceRuleSetStatus.ACTIVE) {
      // Already active, idempotent return
      return ruleSet;
    }

    // Ensure all 6 schedules are represented
    const schedulesPresent = new Set(ruleSet.rules.map((r) => r.medicineSchedule));
    const allSchedules = Object.values(MedicineSchedule);
    for (const schedule of allSchedules) {
      if (!schedulesPresent.has(schedule)) {
        throw new BadRequestException(
          `Cannot activate rule set: missing compliance rule for schedule '${schedule}'.`,
        );
      }
    }

    const now = new Date();

    const activated = await this.prisma.$transaction(async (tx) => {
      // 1. Mark existing active rule set(s) as SUPERSEDED with effectiveUntil = now
      await tx.complianceRuleSet.updateMany({
        where: {
          status: ComplianceRuleSetStatus.ACTIVE,
        },
        data: {
          status: ComplianceRuleSetStatus.SUPERSEDED,
          effectiveUntil: now,
        },
      });

      // 2. Activate target rule set
      return tx.complianceRuleSet.update({
        where: { id: ruleSetId },
        data: {
          status: ComplianceRuleSetStatus.ACTIVE,
          effectiveFrom: now,
          effectiveUntil: null,
          activatedByUserId: userId,
          activationReason: dto.reason,
        },
        include: {
          rules: true,
          createdByUser: { select: { id: true, email: true } },
          activatedByUser: { select: { id: true, email: true } },
        },
      });
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'COMPLIANCE_RULE_SET_ACTIVATED',
      resourceType: 'ComplianceRuleSet',
      resourceId: activated.id,
      metadata: {
        version: activated.version,
        name: activated.name,
        activationReason: dto.reason,
      },
    });

    this.logger.log(`Activated compliance rule set ${activated.version} (${activated.id})`);
    return activated;
  }
}
