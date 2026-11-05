import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvValidationService } from './csv-validation.service';
import { MedicineStatus } from '@prisma/client';

describe('CsvValidationService', () => {
  let service: CsvValidationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      medicine: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new CsvValidationService(mockPrisma);
  });

  it('should validate all valid rows successfully', async () => {
    mockPrisma.medicine.findMany.mockResolvedValue([
      { id: 'uuid-1', sku: 'MED-MET-500-001', status: MedicineStatus.ACTIVE },
      { id: 'uuid-2', sku: 'MED-TEL-40-001', status: MedicineStatus.ACTIVE },
    ]);

    const rawRows = [
      { rowNumber: 2, sku: 'MED-MET-500-001', quantity: '100', reorderLevel: '10' },
      { rowNumber: 3, sku: 'MED-TEL-40-001', quantity: '50', reorderLevel: '5' },
    ];

    const result = await service.validateRows(rawRows);
    expect(result.isValid).toBe(true);
    expect(result.validRows).toHaveLength(2);
    expect(result.rejectedRows).toHaveLength(0);
  });

  it('should reject duplicate SKUs in CSV', async () => {
    const rawRows = [
      { rowNumber: 2, sku: 'MED-MET-500-001', quantity: '100', reorderLevel: '10' },
      { rowNumber: 3, sku: 'MED-MET-500-001', quantity: '50', reorderLevel: '5' },
    ];

    const result = await service.validateRows(rawRows);
    expect(result.isValid).toBe(false);
    expect(result.rejectedRows).toHaveLength(2);
    expect(result.rejectedRows[0].errorMessage).toContain('Duplicate SKU');
  });

  it('should reject negative and decimal quantities', async () => {
    const rawRows = [
      { rowNumber: 2, sku: 'MED-MET-500-001', quantity: '-5', reorderLevel: '10' },
      { rowNumber: 3, sku: 'MED-TEL-40-001', quantity: '12.5', reorderLevel: '10' },
    ];

    const result = await service.validateRows(rawRows);
    expect(result.isValid).toBe(false);
    expect(result.rejectedRows).toHaveLength(2);
    expect(result.rejectedRows[0].errorMessage).toContain(
      'Quantity must be a non-negative integer',
    );
    expect(result.rejectedRows[1].errorMessage).toContain(
      'Quantity must be a non-negative integer',
    );
  });

  it('should reject unknown SKUs not present in catalogue', async () => {
    mockPrisma.medicine.findMany.mockResolvedValue([]);

    const rawRows = [{ rowNumber: 2, sku: 'MED-UNKNOWN-999', quantity: '10', reorderLevel: '5' }];

    const result = await service.validateRows(rawRows);
    expect(result.isValid).toBe(false);
    expect(result.rejectedRows[0].errorMessage).toContain('does not exist in medicine catalogue');
  });

  it('should reject inactive medicines', async () => {
    mockPrisma.medicine.findMany.mockResolvedValue([
      { id: 'uuid-1', sku: 'MED-INACTIVE-001', status: MedicineStatus.INACTIVE },
    ]);

    const rawRows = [{ rowNumber: 2, sku: 'MED-INACTIVE-001', quantity: '10', reorderLevel: '5' }];

    const result = await service.validateRows(rawRows);
    expect(result.isValid).toBe(false);
    expect(result.rejectedRows[0].errorMessage).toContain('is INACTIVE');
  });
});
