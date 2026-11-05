export interface DosageCalculationInput {
  dispensedQuantity: number;
  unitsPerAdministration: number;
  administrationsPerDay: number;
  dosageUnit: string;
  dosageForm?: string | null;
  dispensedAt: Date;
  isPrnOrVariable?: boolean;
}

export interface RefillCalculationResult {
  eligibilityStatus: 'ELIGIBLE' | 'CALCULATION_UNAVAILABLE' | 'AWAITING_VERIFIED_DOSAGE';
  ineligibilityReason?: string;
  dailyConsumption?: number;
  estimatedSupplyDays?: number;
  estimatedRunOutAt?: Date;
  calculationInputs: Record<string, unknown>;
  calculationVersion: number;
}

const SUPPORTED_UNIT_BASED_FORMS = [
  'TABLET',
  'TABLETS',
  'TAB',
  'CAPSULE',
  'CAPSULES',
  'CAP',
  'PILL',
  'PILLS',
  'SACHET',
  'SACHETS',
];

const SUPPORTED_UNITS = [
  'TABLET',
  'TABLETS',
  'TAB',
  'TABS',
  'CAPSULE',
  'CAPSULES',
  'CAP',
  'CAPS',
  'PILL',
  'PILLS',
  'UNIT',
  'UNITS',
];

export class RefillCalculationService {
  private readonly CALCULATION_VERSION = 1;

  /**
   * Deterministic calculation of medicine supply and run-out date.
   * Safety invariants:
   * 1. Dispensary/handover date is used strictly (never order placement or verification date).
   * 2. Units consumed per admin and administrations per day must be explicitly confirmed.
   * 3. PRN, variable-dose, liquid, topical, inhaler items return CALCULATION_UNAVAILABLE.
   * 4. Missing inputs return CALCULATION_UNAVAILABLE.
   */
  calculate(input: DosageCalculationInput): RefillCalculationResult {
    const rawInputs = {
      dispensedQuantity: input.dispensedQuantity,
      unitsPerAdministration: input.unitsPerAdministration,
      administrationsPerDay: input.administrationsPerDay,
      dosageUnit: input.dosageUnit,
      dosageForm: input.dosageForm,
      dispensedAt: input.dispensedAt.toISOString(),
      isPrnOrVariable: Boolean(input.isPrnOrVariable),
    };

    // 1. Check for missing or invalid quantities
    if (!input.dispensedQuantity || input.dispensedQuantity <= 0) {
      return {
        eligibilityStatus: 'CALCULATION_UNAVAILABLE',
        ineligibilityReason: 'Dispensed quantity must be greater than zero.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    if (!input.dispensedAt || !(input.dispensedAt instanceof Date) || isNaN(input.dispensedAt.getTime())) {
      return {
        eligibilityStatus: 'CALCULATION_UNAVAILABLE',
        ineligibilityReason: 'Valid physical handover / dispensing timestamp is required.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    // 2. PRN or variable dosage instructions are not automatically calculated
    if (input.isPrnOrVariable) {
      return {
        eligibilityStatus: 'CALCULATION_UNAVAILABLE',
        ineligibilityReason: 'Variable or PRN (as-needed) dosage schedules do not have a predictable run-out date.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    // 3. Check verified structured dosage values
    if (!input.unitsPerAdministration || input.unitsPerAdministration <= 0) {
      return {
        eligibilityStatus: 'AWAITING_VERIFIED_DOSAGE',
        ineligibilityReason: 'Pharmacist-verified units per administration is required.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    if (!input.administrationsPerDay || input.administrationsPerDay <= 0) {
      return {
        eligibilityStatus: 'AWAITING_VERIFIED_DOSAGE',
        ineligibilityReason: 'Pharmacist-verified daily administrations frequency is required.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    // 4. Validate unit safety
    const normalizedUnit = (input.dosageUnit || '').trim().toUpperCase();
    if (!SUPPORTED_UNITS.includes(normalizedUnit)) {
      return {
        eligibilityStatus: 'CALCULATION_UNAVAILABLE',
        ineligibilityReason: `Dosage unit "${input.dosageUnit}" is not supported for automatic unit-based refill calculation.`,
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    // If dosageForm provided, ensure it's unit-based (not syrup, ointment, etc.)
    if (input.dosageForm) {
      const normalizedForm = input.dosageForm.trim().toUpperCase();
      const isUnitBased = SUPPORTED_UNIT_BASED_FORMS.some((form) => normalizedForm.includes(form));
      if (!isUnitBased) {
        return {
          eligibilityStatus: 'CALCULATION_UNAVAILABLE',
          ineligibilityReason: `Dosage form "${input.dosageForm}" (liquid, topical, or inhalant) has variable consumption and cannot be calculated deterministically.`,
          calculationInputs: rawInputs,
          calculationVersion: this.CALCULATION_VERSION,
        };
      }
    }

    // 5. Deterministic calculation
    // dailyConsumption = unitsPerAdministration * administrationsPerDay
    const dailyConsumption = Number((input.unitsPerAdministration * input.administrationsPerDay).toFixed(2));
    if (dailyConsumption <= 0) {
      return {
        eligibilityStatus: 'CALCULATION_UNAVAILABLE',
        ineligibilityReason: 'Calculated daily consumption is zero or negative.',
        calculationInputs: rawInputs,
        calculationVersion: this.CALCULATION_VERSION,
      };
    }

    // estimatedSupplyDays = dispensedQuantity / dailyConsumption
    const estimatedSupplyDays = Number((input.dispensedQuantity / dailyConsumption).toFixed(2));

    // estimatedRunOutDate = dispensingDate + estimatedSupplyDays (in ms: days * 24 * 60 * 60 * 1000)
    const runOutMs = input.dispensedAt.getTime() + Math.round(estimatedSupplyDays * 24 * 60 * 60 * 1000);
    const estimatedRunOutAt = new Date(runOutMs);

    return {
      eligibilityStatus: 'ELIGIBLE',
      dailyConsumption,
      estimatedSupplyDays,
      estimatedRunOutAt,
      calculationInputs: rawInputs,
      calculationVersion: this.CALCULATION_VERSION,
    };
  }
}
