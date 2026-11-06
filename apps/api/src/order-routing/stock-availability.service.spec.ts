import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockAvailabilityService } from './stock-availability.service';

describe('StockAvailabilityService', () => {
  let service: StockAvailabilityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      store: {
        findUnique: vi.fn(),
      },
      inventoryBalance: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      stockReservation: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    };
    service = new StockAvailabilityService(mockPrisma);
  });

  it('calculates availableStock = onHand - activeReservations correctly', async () => {
    mockPrisma.inventoryBalance.findUnique.mockResolvedValue({ quantity: 50 });
    mockPrisma.stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 15 } });

    const available = await service.getAvailableStock('store-1', 'med-1');
    expect(available).toBe(35);
  });

  it('prevents availableStock from becoming negative if reservations exceed on-hand', async () => {
    mockPrisma.inventoryBalance.findUnique.mockResolvedValue({ quantity: 10 });
    mockPrisma.stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 20 } });

    const available = await service.getAvailableStock('store-1', 'med-1');
    expect(available).toBe(0);
  });

  it('checks store complete stock availability across multiple items', async () => {
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      code: 'KOL-001',
      name: 'Salt Lake Store',
    });
    mockPrisma.inventoryBalance.findMany.mockResolvedValue([
      { medicineId: 'med-1', quantity: 20 },
      { medicineId: 'med-2', quantity: 10 },
    ]);
    mockPrisma.stockReservation.groupBy.mockResolvedValue([
      { medicineId: 'med-1', _sum: { quantity: 5 } },
      { medicineId: 'med-2', _sum: { quantity: 8 } },
    ]);

    const result = await service.checkStoreAvailability('store-1', [
      { medicineId: 'med-1', quantityRequired: 10 }, // avail: 20 - 5 = 15 >= 10 (OK)
      { medicineId: 'med-2', quantityRequired: 5 }, // avail: 10 - 8 = 2 < 5 (FAIL)
    ]);

    expect(result.hasCompleteStock).toBe(false);
    expect(result.unavailableItems).toHaveLength(1);
    expect(result.unavailableItems[0].medicineId).toBe('med-2');
    expect(result.unavailableItems[0].availableStock).toBe(2);
  });
});
