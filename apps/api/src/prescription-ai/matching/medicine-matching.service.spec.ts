import { describe, it, expect, beforeEach } from 'vitest';
import { MedicineMatchingService } from './medicine-matching.service';
import { MedicineStatus, MedicineSchedule, Prisma } from '@prisma/client';

describe('MedicineMatchingService', () => {
  let service: MedicineMatchingService;
  let mockPrisma: any;

  const mockMedicines = [
    {
      id: 'med-met-500',
      sku: 'MED-MET-500-001',
      name: 'Metformin 500 mg',
      brandName: 'Glyciphage Demo',
      genericName: 'Metformin',
      strength: '500 mg',
      dosageForm: 'Tablet',
      packSize: '15 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('30.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      id: 'med-met-1000',
      sku: 'MED-MET-1000-001',
      name: 'Metformin 1000 mg',
      brandName: 'Glycomet Demo',
      genericName: 'Metformin',
      strength: '1000 mg',
      dosageForm: 'Tablet',
      packSize: '10 tablets',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('55.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      id: 'med-amx-500',
      sku: 'MED-AMX-500-001',
      name: 'Amoxicillin 500 mg',
      brandName: 'Novamox Demo',
      genericName: 'Amoxicillin',
      strength: '500 mg',
      dosageForm: 'Capsule',
      packSize: '10 capsules',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('85.00'),
      status: MedicineStatus.ACTIVE,
    },
    {
      id: 'med-amx-syp',
      sku: 'MED-AMX-SYP-001',
      name: 'Amoxicillin Syrup 125 mg/5ml',
      brandName: 'Novamox Syrup',
      genericName: 'Amoxicillin',
      strength: '125 mg/5ml',
      dosageForm: 'Syrup',
      packSize: '60 ml',
      schedule: MedicineSchedule.SCHEDULE_H,
      mrp: new Prisma.Decimal('60.00'),
      status: MedicineStatus.ACTIVE,
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      medicine: {
        findMany: async () => mockMedicines,
      },
    };
    service = new MedicineMatchingService(mockPrisma as any);
  });

  it('matches medicine with exact strength and dosage form with high confidence', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Metformin 500 mg',
        normalizedMedicineName: 'Metformin',
        strength: '500 mg',
        dosageForm: 'Tablet',
        dosageInstructions: '1 tablet daily',
        frequency: 'OD',
        duration: '30 days',
        quantity: 30,
        confidence: 0.95,
        sourceText: 'Tab. Metformin 500mg 1 OD',
        warnings: [],
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].matchStatus).toBe('MATCHED');
    expect(results[0].selectedMedicineId).toBe('med-met-500');
    expect(results[0].candidates[0].matchReasons).toContain('EXACT_STRENGTH_MATCH');
    expect(results[0].candidates[0].matchReasons).toContain('COMPATIBLE_DOSAGE_FORM');
  });

  it('returns AMBIGUOUS when multiple candidates match without explicit strength', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Metformin',
        normalizedMedicineName: 'Metformin',
        strength: null, // missing strength makes 500mg vs 1000mg ambiguous
        dosageForm: 'Tablet',
        dosageInstructions: '1 tab daily',
        frequency: 'OD',
        duration: null,
        quantity: null,
        confidence: 0.7,
        sourceText: 'Tab. Metformin',
        warnings: [],
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].matchStatus).toBe('AMBIGUOUS');
    expect(results[0].selectedMedicineId).toBeNull();
    expect(results[0].candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects candidate if strength conflicts with prescription', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Metformin 250 mg',
        normalizedMedicineName: 'Metformin',
        strength: '250 mg', // Catalogue only has 500mg and 1000mg
        dosageForm: 'Tablet',
        dosageInstructions: '1 tablet daily',
        frequency: 'OD',
        duration: '10 days',
        quantity: 10,
        confidence: 0.9,
        sourceText: 'Tab. Metformin 250mg',
        warnings: [],
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].matchStatus).toBe('NOT_FOUND');
    expect(results[0].selectedMedicineId).toBeNull();
  });

  it('rejects candidate if dosage form conflicts (Syrup vs Tablet)', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Amoxicillin Tablet',
        normalizedMedicineName: 'Amoxicillin',
        strength: '125 mg/5ml',
        dosageForm: 'Tablet', // conflicts with Syrup
        dosageInstructions: '1 tab daily',
        frequency: 'OD',
        duration: null,
        quantity: null,
        confidence: 0.8,
        sourceText: 'Tab. Amoxicillin 125mg/5ml',
        warnings: [],
      },
    ]);

    expect(results).toHaveLength(1);
    // Should not match Syrup because form is Tablet
    const syrupMatch = results[0].candidates.find((c) => c.medicineId === 'med-amx-syp');
    expect(syrupMatch).toBeUndefined();
  });

  it('returns NOT_FOUND for medicines absent from catalogue', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Atorvastatin 20 mg',
        normalizedMedicineName: 'Atorvastatin',
        strength: '20 mg',
        dosageForm: 'Tablet',
        dosageInstructions: '1 at night',
        frequency: 'HS',
        duration: null,
        quantity: null,
        confidence: 0.9,
        sourceText: 'Tab Atorva 20',
        warnings: [],
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].matchStatus).toBe('NOT_FOUND');
    expect(results[0].selectedMedicineId).toBeNull();
    expect(results[0].candidates).toHaveLength(0);
  });

  it('suggests generic alternatives with same active ingredient', async () => {
    const results = await service.matchExtractedMedicines([
      {
        rawMedicineName: 'Metformin 500 mg',
        normalizedMedicineName: 'Metformin',
        strength: '500 mg',
        dosageForm: 'Tablet',
        dosageInstructions: '1 tab daily',
        frequency: 'OD',
        duration: null,
        quantity: null,
        confidence: 0.95,
        sourceText: 'Tab. Metformin 500mg',
        warnings: [],
      },
    ]);

    expect(results[0].genericAlternatives).toBeDefined();
    // med-met-1000 is also generic Metformin
    const hasMetforminAlt = results[0].genericAlternatives?.some(
      (a) => a.genericName === 'Metformin',
    );
    expect(hasMetforminAlt).toBe(true);
  });
});
