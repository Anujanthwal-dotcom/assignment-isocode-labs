import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { BadRequestException } from '@nestjs/common';
import { MedicineStatus, StoreStatus, InventoryMovementType } from '@prisma/client';

describe('InventoryAdjustmentService', () => {
  let service: InventoryAdjustmentService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      medicine: {
        findUnique: vi.fn(),
      },
      store: {
        findUnique: vi.fn(),
      },
      warehouse: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    mockAudit = {
      record: vi.fn(),
    };
    service = new InventoryAdjustmentService(mockPrisma, mockAudit);
  });

  it('should reject quantityChange of zero', async () => {
    await expect(
      service.adjustStock(
        { id: 'admin-1' },
        {
          medicineId: 'med-1',
          locationType: 'STORE',
          locationId: 'store-1',
          quantityChange: 0,
          reason: 'Correction',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject adjustment on inactive medicine', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-1',
      status: MedicineStatus.INACTIVE,
    });

    await expect(
      service.adjustStock(
        { id: 'admin-1' },
        {
          medicineId: 'med-1',
          locationType: 'STORE',
          locationId: 'store-1',
          quantityChange: 10,
          reason: 'Found stock',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject adjustment if resulting inventory is negative', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-1',
      status: MedicineStatus.ACTIVE,
    });
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.ACTIVE,
    });

    // Mock tx transaction
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'bal-1', quantity: 5, reorderLevel: 10 }]),
      };
      return callback(tx);
    });

    await expect(
      service.adjustStock(
        { id: 'admin-1' },
        {
          medicineId: 'med-1',
          locationType: 'STORE',
          locationId: 'store-1',
          quantityChange: -10, // 5 - 10 = -5 < 0
          reason: 'Damaged',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should apply valid positive adjustment and create movement record', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-1',
      status: MedicineStatus.ACTIVE,
    });
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.ACTIVE,
    });

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'bal-1', quantity: 15, reorderLevel: 10 }]),
        inventoryBalance: {
          update: vi.fn().mockResolvedValue({ id: 'bal-1', quantity: 20 }),
        },
        inventoryMovement: {
          create: vi.fn().mockResolvedValue({
            id: 'mov-1',
            quantityBefore: 15,
            quantityChange: 5,
            quantityAfter: 20,
            movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
          }),
        },
      };
      return callback(tx);
    });

    const res = await service.adjustStock(
      { id: 'admin-1' },
      {
        medicineId: 'med-1',
        locationType: 'STORE',
        locationId: 'store-1',
        quantityChange: 5,
        reason: 'Restock correction',
      },
    );

    expect(res.balance.quantity).toBe(20);
    expect(res.movement.quantityAfter).toBe(20);
    expect(mockAudit.record).toHaveBeenCalled();
  });
});
