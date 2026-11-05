import { Injectable, Logger } from '@nestjs/common';
import { MedicineSchedule } from '@prisma/client';
import { ComplianceRuleService } from './compliance-rule.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ComplianceDecision,
  ComplianceEvaluationResult,
} from '@pharmacy/shared-types';

export interface EvaluateMedicineParams {
  medicineId: string;
  schedule: MedicineSchedule | string;
  hasPrescription: boolean;
  hasH1RegisterDetails?: boolean;
  ruleSetId?: string;
}

@Injectable()
export class ComplianceEvaluatorService {
  private readonly logger = new Logger(ComplianceEvaluatorService.name);

  constructor(
    private readonly ruleService: ComplianceRuleService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Evaluates deterministic compliance policies for a catalogue medicine.
   * AI output NEVER authorizes dispensing or alters deterministic compliance decisions.
   */
  async evaluate(params: EvaluateMedicineParams): Promise<ComplianceEvaluationResult> {
    const evaluatedAt = new Date().toISOString();

    // 1. Fetch active or designated rule set
    let ruleSet: ({ id: string; rules: any[] } & Record<string, any>) | null = null;
    if (params.ruleSetId) {
      ruleSet = await this.prisma.complianceRuleSet.findUnique({
        where: { id: params.ruleSetId },
        include: { rules: true },
      });
    } else {
      ruleSet = await this.ruleService.getActiveRuleSet();
    }

    // Fail closed if no active rule set is configured
    if (!ruleSet) {
      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'UNKNOWN_CLASSIFICATION',
        canApprove: false,
        reasons: [
          'No active compliance rule set is configured. System fails closed.',
        ],
        ruleVersionId: 'NONE',
        evaluatedAt,
      };
    }

    const normSchedule = params.schedule as MedicineSchedule;
    const rule = ruleSet.rules.find((r) => r.medicineSchedule === normSchedule);

    // Fail closed if no rule matches this medicine schedule
    if (!rule) {
      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'UNKNOWN_CLASSIFICATION',
        canApprove: false,
        reasons: [
          `No compliance policy configured for schedule '${params.schedule}'. System fails closed.`,
        ],
        ruleVersionId: ruleSet.id,
        evaluatedAt,
      };
    }

    // 2. Hard Blocks: Schedule X, Narcotic, or explicit hardBlocked flag
    if (rule.hardBlocked || normSchedule === MedicineSchedule.SCHEDULE_X || normSchedule === MedicineSchedule.NARCOTIC) {
      const blockReason =
        normSchedule === MedicineSchedule.SCHEDULE_X
          ? 'Schedule X substances are not permitted for online dispensing under the assignment policy.'
          : normSchedule === MedicineSchedule.NARCOTIC
            ? 'Narcotic drugs are hard-blocked from dispensing under the assignment policy.'
            : (rule.description || 'Medicine category is hard-blocked by compliance policy.');

      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'BLOCKED',
        canApprove: false,
        reasons: [blockReason],
        ruleVersionId: ruleSet.id,
        evaluatedAt,
      };
    }

    // 3. Fail closed on UNKNOWN
    if (normSchedule === MedicineSchedule.UNKNOWN || rule.policyAction === 'FAIL_CLOSED') {
      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'UNKNOWN_CLASSIFICATION',
        canApprove: false,
        reasons: [
          'Medicine classification requires compliance review before approval.',
        ],
        ruleVersionId: ruleSet.id,
        evaluatedAt,
      };
    }

    // 4. Schedule H1: requires prescription, H1 register info, and pharmacist approval
    if (rule.requiresH1Register || normSchedule === MedicineSchedule.SCHEDULE_H1) {
      if (!params.hasPrescription) {
        return {
          medicineId: params.medicineId,
          schedule: params.schedule,
          decision: 'REQUIRES_PRESCRIPTION',
          canApprove: false,
          reasons: [
            'Schedule H1 medicine requires a valid uploaded prescription.',
            'Schedule H1 register entry (patient and prescriber details) must be recorded.',
          ],
          ruleVersionId: ruleSet.id,
          evaluatedAt,
        };
      }

      if (!params.hasH1RegisterDetails) {
        return {
          medicineId: params.medicineId,
          schedule: params.schedule,
          decision: 'REQUIRES_H1_REGISTER',
          canApprove: false,
          reasons: [
            'Schedule H1 register information (patient name and prescriber name) is required before approval.',
          ],
          ruleVersionId: ruleSet.id,
          evaluatedAt,
        };
      }

      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'REQUIRES_PHARMACIST_APPROVAL',
        canApprove: true,
        reasons: [
          'Valid prescription and H1 register details verified. Explicit pharmacist approval required.',
        ],
        ruleVersionId: ruleSet.id,
        evaluatedAt,
      };
    }

    // 5. Schedule H: requires prescription and pharmacist approval
    if (rule.requiresPrescription || normSchedule === MedicineSchedule.SCHEDULE_H) {
      if (!params.hasPrescription) {
        return {
          medicineId: params.medicineId,
          schedule: params.schedule,
          decision: 'REQUIRES_PRESCRIPTION',
          canApprove: false,
          reasons: [
            'Schedule H medicine requires a valid uploaded prescription.',
          ],
          ruleVersionId: ruleSet.id,
          evaluatedAt,
        };
      }

      return {
        medicineId: params.medicineId,
        schedule: params.schedule,
        decision: 'REQUIRES_PHARMACIST_APPROVAL',
        canApprove: true,
        reasons: [
          'Valid prescription provided. Explicit pharmacist approval required.',
        ],
        ruleVersionId: ruleSet.id,
        evaluatedAt,
      };
    }

    // 6. OTC: Pharmacist review still required for every medicine item
    return {
      medicineId: params.medicineId,
      schedule: params.schedule,
      decision: 'ALLOWED_FOR_REVIEW',
      canApprove: true,
      reasons: [
        'OTC medicine eligible for review. Explicit pharmacist approval is required for every medicine item.',
      ],
      ruleVersionId: ruleSet.id,
      evaluatedAt,
    };
  }
}
