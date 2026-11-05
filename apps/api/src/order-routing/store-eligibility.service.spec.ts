import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreEligibilityService } from './store-eligibility.service';

describe('StoreEligibilityService', () => {
  let service: StoreEligibilityService;
  let mockPrisma: any;
  let mockStockAvail: any;
  let mockDistance: any;

  beforeEach(() => {
    mockPrisma = {
      store: {
        findMany: vi.fn(),
      },
    };
    mockStockAvail = {
      checkStoreAvailability: vi.fn(),
    };
    mockDistance = {
      isValidCoordinates: vi.fn().mockReturnValue(true),
      calculateDistanceKm: vi.fn(),
    };
    service = new StoreEligibilityService(mockPrisma, mockStockAvail, mockDistance);
  });

  it('selects nearest store with complete stock and excludes stores missing any items', async () => {
    // 3 active stores
    mockPrisma.store.findMany.mockResolvedValue([
      { id: 's1', code: 'HOW-001', name: 'Howrah Store', latitude: 22.58, longitude: 88.32 },
      { id: 's2', code: 'KOL-001', name: 'Salt Lake Store', latitude: 22.58, longitude: 88.41 },
      { id: 's3', code: 'SOU-001', name: 'South Store', latitude: 22.52, longitude: 88.36 },
    ]);

    // s1 is closest but missing stock for 1 item
    mockStockAvail.checkStoreAvailability.mockImplementation((storeId: string) => {
      if (storeId === 's1') {
        return Promise.resolve({ hasCompleteStock: false, unavailableItems: [{}] });
      }
      return Promise.resolve({ hasCompleteStock: true, unavailableItems: [] });
    });

    // Distances: s2 is 5 km, s3 is 12 km
    mockDistance.calculateDistanceKm.mockImplementation((_c: any, dest: any) => {
      if (dest.longitude === 88.41) return 5.0; // s2
      if (dest.longitude === 88.36) return 12.0; // s3
      return 2.0;
    });

    const items = [{ medicineId: 'm1', quantityRequired: 2 }];
    const customerCoords = { latitude: 22.58, longitude: 88.40 };

    const result = await service.findEligibleStores(items, customerCoords);

    expect(result.eligibleStores).toHaveLength(2);
    // Nearest eligible with complete stock must be s2 (KOL-001)
    expect(result.eligibleStores[0].storeCode).toBe('KOL-001');
    expect(result.eligibleStores[0].distanceKm).toBe(5.0);
    // Second eligible is s3 (SOU-001)
    expect(result.eligibleStores[1].storeCode).toBe('SOU-001');
    expect(result.eligibleStores[1].distanceKm).toBe(12.0);
    // s1 was excluded due to stock
    expect(result.storesWithoutStock).toHaveLength(1);
    expect(result.storesWithoutStock[0].storeCode).toBe('HOW-001');
  });

  it('tie-breaks deterministically using store code ascending when distances match', async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: 's2', code: 'KOL-001', name: 'Store B', latitude: 22.5, longitude: 88.4 },
      { id: 's1', code: 'HOW-001', name: 'Store A', latitude: 22.5, longitude: 88.4 },
    ]);

    mockStockAvail.checkStoreAvailability.mockResolvedValue({
      hasCompleteStock: true,
      unavailableItems: [],
    });

    // Identical distance: 5.0 km
    mockDistance.calculateDistanceKm.mockReturnValue(5.0);

    const items = [{ medicineId: 'm1', quantityRequired: 1 }];
    const customerCoords = { latitude: 22.5, longitude: 88.3 };

    const result = await service.findEligibleStores(items, customerCoords);

    expect(result.eligibleStores).toHaveLength(2);
    // HOW-001 comes before KOL-001 alphabetically
    expect(result.eligibleStores[0].storeCode).toBe('HOW-001');
    expect(result.eligibleStores[1].storeCode).toBe('KOL-001');
  });
});
