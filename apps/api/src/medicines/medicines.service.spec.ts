import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicinesService } from './medicines.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MedicineStatus, MedicineSchedule, UserRole } from '@prisma/client';

describe('MedicinesService', () => {
  let service: MedicinesService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      medicine: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      inventoryBalance: {
        findMany: vi.fn(),
      },
      pharmacistProfile: {
        findUnique: vi.fn(),
      },
    };
    mockAudit = {
      record: vi.fn(),
    };
    service = new MedicinesService(mockPrisma, mockAudit);
  });

  it('should successfully create a medicine with normalized SKU', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue(null);
    mockPrisma.medicine.create.mockResolvedValue({
      id: 'uuid-1',
      sku: 'MED-MET-500-001',
      name: 'Metformin 500 mg',
      mrp: 30.0,
      status: MedicineStatus.ACTIVE,
      schedule: MedicineSchedule.SCHEDULE_H,
    });

    const res = await service.create(
      {
        sku: ' med-met-500-001 ',
        name: 'Metformin 500 mg',
        mrp: 30.0,
        schedule: MedicineSchedule.SCHEDULE_H,
      },
      'admin-id',
    );

    expect(res.sku).toBe('MED-MET-500-001');
    expect(mockAudit.record).toHaveBeenCalled();
  });

  it('should reject invalid SKU format', async () => {
    await expect(
      service.create(
        {
          sku: '!!',
          name: 'Invalid Med',
          mrp: 10.0,
        },
        'admin-id',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject duplicate SKU', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.create(
        {
          sku: 'MED-MET-500-001',
          name: 'Metformin 500 mg',
          mrp: 30.0,
        },
        'admin-id',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should filter inventory balances by assigned store for pharmacist', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-1',
      name: 'Paracetamol',
      mrp: 20,
    });
    mockPrisma.pharmacistProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });
    mockPrisma.inventoryBalance.findMany.mockResolvedValue([
      {
        id: 'bal-1',
        storeId: 'store-kol-1',
        warehouseId: null,
        quantity: 100,
        reorderLevel: 10,
        updatedAt: new Date(),
        store: { id: 'store-kol-1', code: 'KOL-001', name: 'Salt Lake', city: 'Kolkata' },
      },
    ]);

    const res = await service.findById('med-1', { id: 'user-pharm-1', role: UserRole.PHARMACIST });
    expect(res.inventoryBalances).toHaveLength(1);
    expect(res.inventoryBalances[0].locationCode).toBe('KOL-001');
    expect(mockPrisma.inventoryBalance.findMany).toHaveBeenCalledWith({
      where: { medicineId: 'med-1', storeId: 'store-kol-1' },
      include: expect.any(Object),
    });
  });
});
