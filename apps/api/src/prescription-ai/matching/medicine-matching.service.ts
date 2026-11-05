import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExtractedPrescriptionItemDTO,
  MedicineMatchResultDTO,
  MedicineMatchCandidateDTO,
  GenericAlternativeDTO,
} from '@pharmacy/shared-types';
import { Medicine, MedicineStatus } from '@prisma/client';

@Injectable()
export class MedicineMatchingService {
  private readonly logger = new Logger(MedicineMatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async matchExtractedMedicines(
    items: ExtractedPrescriptionItemDTO[],
  ): Promise<MedicineMatchResultDTO[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Retrieve all active medicines from catalogue
    const activeMedicines = await this.prisma.medicine.findMany({
      where: { status: MedicineStatus.ACTIVE },
    });

    return items.map((item, index) => this.matchSingleItem(item, index, activeMedicines));
  }

  private matchSingleItem(
    item: ExtractedPrescriptionItemDTO,
    extractedItemIndex: number,
    catalogue: Medicine[],
  ): MedicineMatchResultDTO {
    const searchTerms = [
      item.normalizedMedicineName,
      item.rawMedicineName,
    ].filter(Boolean) as string[];

    const normalizedExtractedStrength = this.normalizeStrength(item.strength);
    const normalizedExtractedForm = this.normalizeDosageForm(item.dosageForm);

    const candidatesWithScore: Array<{
      medicine: Medicine;
      score: number;
      reasons: string[];
    }> = [];

    for (const med of catalogue) {
      const matchDetails = this.evaluateCandidateMatch(
        searchTerms,
        normalizedExtractedStrength,
        normalizedExtractedForm,
        med,
      );

      if (matchDetails.isEligible && matchDetails.score > 0.4) {
        candidatesWithScore.push({
          medicine: med,
          score: matchDetails.score,
          reasons: matchDetails.reasons,
        });
      }
    }

    // Sort descending by score
    candidatesWithScore.sort((a, b) => b.score - a.score);

    const candidates: MedicineMatchCandidateDTO[] = candidatesWithScore.map((c) => ({
      medicineId: c.medicine.id,
      confidence: Math.min(Math.round(c.score * 100) / 100, 1),
      matchReasons: c.reasons,
    }));

    let selectedMedicineId: string | null = null;
    let matchStatus: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';

    if (candidatesWithScore.length === 0) {
      matchStatus = 'NOT_FOUND';
    } else if (candidatesWithScore.length === 1) {
      const top = candidatesWithScore[0];
      // Require exact strength and compatible dosage form for high-confidence MATCHED
      const hasExactStrength = top.reasons.includes('EXACT_STRENGTH_MATCH');
      const hasCompatibleForm =
        top.reasons.includes('COMPATIBLE_DOSAGE_FORM') ||
        top.reasons.includes('FORM_NOT_SPECIFIED');

      if (top.score >= 0.85 && hasExactStrength && hasCompatibleForm) {
        selectedMedicineId = top.medicine.id;
        matchStatus = 'MATCHED';
      } else {
        matchStatus = 'AMBIGUOUS';
      }
    } else {
      const top = candidatesWithScore[0];
      const runnerUp = candidatesWithScore[1];

      // If top candidate is sufficiently superior and meets strict strength/form criteria
      const hasExactStrength = top.reasons.includes('EXACT_STRENGTH_MATCH');
      const hasCompatibleForm =
        top.reasons.includes('COMPATIBLE_DOSAGE_FORM') ||
        top.reasons.includes('FORM_NOT_SPECIFIED');

      if (
        top.score >= 0.88 &&
        top.score - runnerUp.score >= 0.25 &&
        hasExactStrength &&
        hasCompatibleForm
      ) {
        selectedMedicineId = top.medicine.id;
        matchStatus = 'MATCHED';
      } else {
        // When multiple candidates are similarly plausible, never auto-select
        matchStatus = 'AMBIGUOUS';
        selectedMedicineId = null;
      }
    }

    // Optional Generic Alternatives suggestion
    const genericAlternatives = this.findGenericAlternatives(
      item,
      selectedMedicineId,
      catalogue,
    );

    return {
      extractedItemIndex,
      candidates,
      selectedMedicineId,
      matchStatus,
      genericAlternatives,
    };
  }

  private evaluateCandidateMatch(
    searchTerms: string[],
    extractedStrength: string | null,
    extractedForm: string | null,
    med: Medicine,
  ): { isEligible: boolean; score: number; reasons: string[] } {
    const medStrength = this.normalizeStrength(med.strength);
    const medForm = this.normalizeDosageForm(med.dosageForm);
    const medGeneric = (med.genericName || '').toLowerCase().trim();
    const medBrand = (med.brandName || '').toLowerCase().trim();
    const medName = med.name.toLowerCase().trim();

    // Check strength conflict: if prescription specifies strength and catalogue conflicts
    if (extractedStrength && medStrength && extractedStrength !== medStrength) {
      return { isEligible: false, score: 0, reasons: ['CONFLICTING_STRENGTH'] };
    }

    // Check dosage form conflict
    if (extractedForm && medForm && !this.areFormsCompatible(extractedForm, medForm)) {
      return { isEligible: false, score: 0, reasons: ['CONFLICTING_DOSAGE_FORM'] };
    }

    let score = 0;
    const reasons: string[] = [];

    // Name matching
    let nameMatched = false;
    for (const term of searchTerms) {
      const cleanTerm = this.cleanName(term);
      if (!cleanTerm) continue;

      if (medGeneric && (cleanTerm === medGeneric || cleanTerm.includes(medGeneric) || medGeneric.includes(cleanTerm))) {
        score += 0.45;
        reasons.push('GENERIC_NAME_MATCH');
        nameMatched = true;
        break;
      } else if (medBrand && (cleanTerm === medBrand || cleanTerm.includes(medBrand) || medBrand.includes(cleanTerm))) {
        score += 0.45;
        reasons.push('BRAND_NAME_MATCH');
        nameMatched = true;
        break;
      } else if (cleanTerm === this.cleanName(medName) || cleanTerm.includes(this.cleanName(medName))) {
        score += 0.4;
        reasons.push('NAME_MATCH');
        nameMatched = true;
        break;
      }
    }

    if (!nameMatched) {
      return { isEligible: false, score: 0, reasons: [] };
    }

    // Strength evaluation
    if (extractedStrength && medStrength && extractedStrength === medStrength) {
      score += 0.35;
      reasons.push('EXACT_STRENGTH_MATCH');
    } else if (!extractedStrength) {
      score += 0.1;
      reasons.push('STRENGTH_NOT_SPECIFIED');
    }

    // Dosage Form evaluation
    if (extractedForm && medForm && this.areFormsCompatible(extractedForm, medForm)) {
      score += 0.18;
      reasons.push('COMPATIBLE_DOSAGE_FORM');
    } else if (!extractedForm) {
      score += 0.05;
      reasons.push('FORM_NOT_SPECIFIED');
    }

    return {
      isEligible: true,
      score: Math.min(score, 1),
      reasons,
    };
  }

  private findGenericAlternatives(
    item: ExtractedPrescriptionItemDTO,
    selectedMedicineId: string | null,
    catalogue: Medicine[],
  ): GenericAlternativeDTO[] {
    const rawTarget = (
      item.normalizedMedicineName ||
      item.rawMedicineName ||
      ''
    ).toLowerCase().trim();

    if (!rawTarget) return [];

    const alternatives: GenericAlternativeDTO[] = [];

    for (const med of catalogue) {
      if (selectedMedicineId && med.id === selectedMedicineId) continue;
      const generic = (med.genericName || '').toLowerCase().trim();
      if (generic && (rawTarget.includes(generic) || generic.includes(rawTarget))) {
        alternatives.push({
          medicineId: med.id,
          sku: med.sku,
          name: med.name,
          brandName: med.brandName,
          genericName: med.genericName,
          strength: med.strength,
          dosageForm: med.dosageForm,
          mrp: med.mrp.toString(),
        });
      }
    }

    return alternatives.slice(0, 3);
  }

  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/tab\.|cap\.|tablet|capsule|syrup|injection/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeStrength(strength: string | null | undefined): string | null {
    if (!strength) return null;
    return strength
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }

  private normalizeDosageForm(form: string | null | undefined): string | null {
    if (!form) return null;
    const f = form.toLowerCase().trim();
    if (f.includes('tab')) return 'tablet';
    if (f.includes('cap')) return 'capsule';
    if (f.includes('syp') || f.includes('syrup')) return 'syrup';
    if (f.includes('powd') || f.includes('sachet')) return 'powder';
    if (f.includes('oint') || f.includes('gel')) return 'ointment';
    return f;
  }

  private areFormsCompatible(extracted: string, catalogue: string): boolean {
    return extracted === catalogue;
  }
}
