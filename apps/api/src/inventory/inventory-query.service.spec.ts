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
});
