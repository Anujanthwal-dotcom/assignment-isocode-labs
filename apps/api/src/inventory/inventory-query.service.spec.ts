import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryQueryService } from './inventory-query.service';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('InventoryQueryService RBAC', () => {
  let service: InventoryQueryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      pharmacistProfile: {
        findUnique: vi.fn(),
      },
      staffProfile: {
        findUnique: vi.fn(),
      },
      $queryRaw: vi.fn(),
      medicine: { count: vi.fn() },
      inventoryBalance: { count: vi.fn(), aggregate: vi.fn() },
      store: { count: vi.fn() },
      warehouse: { count: vi.fn() },
    };
    service = new InventoryQueryService(mockPrisma);
  });

  it('should deny customer access with 403', async () => {
    await expect(
      service.listInventory({ id: 'cust-1', role: UserRole.CUSTOMER }, {
        page: 1,
        limit: 10,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent pharmacist from querying warehouse with 403', async () => {
    mockPrisma.pharmacistProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });

    await expect(
      service.listInventory({ id: 'pharm-1', role: UserRole.PHARMACIST }, {
        warehouseId: 'warehouse-kol-1',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent pharmacist from querying another store with 403', async () => {
    mockPrisma.pharmacistProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });

    await expect(
      service.listInventory({ id: 'pharm-1', role: UserRole.PHARMACIST }, {
        storeId: 'store-how-1',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent store staff from querying warehouse with 403', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });

    await expect(
      service.listInventory({ id: 'staff-1', role: UserRole.STORE_STAFF }, {
        warehouseId: 'warehouse-kol-1',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent store staff from querying another store with 403', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });

    await expect(
      service.listInventory({ id: 'staff-1', role: UserRole.STORE_STAFF }, {
        storeId: 'store-how-1',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow store staff to query their assigned store', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({
      storeId: 'store-kol-1',
    });
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([
        {
          id: 'b-1',
          medicineId: 'med-1',
          storeId: 'store-kol-1',
          warehouseId: null,
          quantity: 100,
          reorderLevel: 20,
          updatedAt: new Date(),
          createdAt: new Date(),
          medicine_sku: 'MED-TEL-40-001',
          medicine_name: 'Telmisartan 40mg',
          medicine_brand: null,
          medicine_generic: null,
          medicine_strength: '40mg',
          medicine_form: 'Tablet',
          medicine_pack: null,
          medicine_mrp: '50.00',
          medicine_schedule: 'SCHEDULE_H',
          medicine_status: 'ACTIVE',
          store_code: 'KOL-001',
          store_name: 'Salt Lake Store',
          store_city: 'Kolkata',
          warehouse_code: null,
          warehouse_name: null,
          warehouse_city: null,
        },
      ]);

    const result = await service.listInventory(
      { id: 'staff-1', role: UserRole.STORE_STAFF },
      { storeId: 'store-kol-1', page: 1, limit: 10 } as any,
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0].quantity).toBe(100);
    expect(result.data[0].location.code).toBe('KOL-001');
  });
});
