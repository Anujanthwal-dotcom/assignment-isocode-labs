import { describe, it, expect } from 'vitest';
import { RefillCalculationService } from './refill-calculation.service';

describe('RefillCalculationService', () => {
  const service = new RefillCalculationService();
  const dispensedAt = new Date('2026-11-01T10:00:00.000Z');

  it('1. 60 tablets at 2 tablets/day gives 30 estimated supply days', () => {
    const res = service.calculate({
      dispensedQuantity: 60,
      unitsPerAdministration: 1,
      administrationsPerDay: 2,
      dosageUnit: 'TABLET',
      dosageForm: 'TABLET',
      dispensedAt,
    });

    expect(res.eligibilityStatus).toBe('ELIGIBLE');
    expect(res.dailyConsumption).toBe(2);
    expect(res.estimatedSupplyDays).toBe(30);
    // 30 days later: 2026-12-01
    expect(res.estimatedRunOutAt?.toISOString()).toBe(
      new Date(dispensedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it('2. 30 tablets at 1 tablet/day gives 30 estimated supply days', () => {
    const res = service.calculate({
      dispensedQuantity: 30,
      unitsPerAdministration: 1,
      administrationsPerDay: 1,
      dosageUnit: 'TABLETS',
      dosageForm: 'TAB',
      dispensedAt,
    });

    expect(res.eligibilityStatus).toBe('ELIGIBLE');
    expect(res.dailyConsumption).toBe(1);
    expect(res.estimatedSupplyDays).toBe(30);
  });

  it('3. Missing dosage makes the calculation unavailable', () => {
    const res = service.calculate({
      dispensedQuantity: 30,
      unitsPerAdministration: 0,
      administrationsPerDay: 1,
      dosageUnit: 'TABLET',
      dispensedAt,
    });

    expect(res.eligibilityStatus).toBe('AWAITING_VERIFIED_DOSAGE');
    expect(res.estimatedSupplyDays).toBeUndefined();
    expect(res.estimatedRunOutAt).toBeUndefined();
  });

  it('4. Missing dispensed quantity makes the calculation unavailable', () => {
    const res = service.calculate({
      dispensedQuantity: 0,
      unitsPerAdministration: 1,
      administrationsPerDay: 2,
      dosageUnit: 'TABLET',
      dispensedAt,
    });

    expect(res.eligibilityStatus).toBe('CALCULATION_UNAVAILABLE');
    expect(res.ineligibilityReason).toContain('Dispensed quantity');
  });

  it('5. Variable dosage is not guessed', () => {
    const res = service.calculate({
      dispensedQuantity: 60,
      unitsPerAdministration: 1,
      administrationsPerDay: 2,
      dosageUnit: 'TABLET',
      dispensedAt,
      isPrnOrVariable: true,
    });

    expect(res.eligibilityStatus).toBe('CALCULATION_UNAVAILABLE');
    expect(res.ineligibilityReason).toContain('Variable or PRN');
  });

  it('6. PRN dosage is not automatically estimated', () => {
    const res = service.calculate({
      dispensedQuantity: 60,
      unitsPerAdministration: 1,
      administrationsPerDay: 3,
      dosageUnit: 'TABLET',
      dispensedAt,
      isPrnOrVariable: true,
    });

    expect(res.eligibilityStatus).toBe('CALCULATION_UNAVAILABLE');
  });

  it('7. Unsupported dosage units or forms are rejected safely', () => {
    const liquidRes = service.calculate({
      dispensedQuantity: 100,
      unitsPerAdministration: 5,
      administrationsPerDay: 2,
      dosageUnit: 'ML',
      dosageForm: 'SYRUP',
      dispensedAt,
    });

    expect(liquidRes.eligibilityStatus).toBe('CALCULATION_UNAVAILABLE');
    expect(liquidRes.ineligibilityReason).toContain('not supported');
  });

  it('8. Calculation uses actual handover/dispensing timestamp, never order creation timestamp', () => {
    const orderCreatedAt = new Date('2026-10-25T10:00:00.000Z');
    const physicalHandoverAt = new Date('2026-11-01T10:00:00.000Z');

    const res = service.calculate({
      dispensedQuantity: 10,
      unitsPerAdministration: 1,
      administrationsPerDay: 1,
      dosageUnit: 'TABLET',
      dispensedAt: physicalHandoverAt, // Passing handover timestamp
    });

    expect(res.eligibilityStatus).toBe('ELIGIBLE');
    expect(res.estimatedSupplyDays).toBe(10);
    // Verified it's exactly physicalHandoverAt + 10 days, not orderCreatedAt + 10 days
    expect(res.estimatedRunOutAt?.getTime()).toBe(
      physicalHandoverAt.getTime() + 10 * 24 * 60 * 60 * 1000,
    );
    expect(res.estimatedRunOutAt?.getTime()).not.toBe(
      orderCreatedAt.getTime() + 10 * 24 * 60 * 60 * 1000,
    );
  });
});
