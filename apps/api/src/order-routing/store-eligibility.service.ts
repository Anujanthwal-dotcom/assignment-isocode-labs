import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreStatus } from '@prisma/client';
import { StockAvailabilityService, StoreStockCheckItem } from './stock-availability.service';
import { StoreDistanceService, Coordinates } from './store-distance.service';

export interface EligibleStoreCandidate {
  storeId: string;
  storeCode: string;
  storeName: string;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
}

@Injectable()
export class StoreEligibilityService {
  private readonly logger = new Logger(StoreEligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockAvailabilityService: StockAvailabilityService,
    private readonly storeDistanceService: StoreDistanceService,
  ) {}

  /**
   * Identifies all active stores with complete stock availability for all items,
   * calculates distance if customer and store coordinates exist,
   * and sorts by distance ascending with deterministic tie-breaking (storeCode ascending).
   */
  async findEligibleStores(
    items: StoreStockCheckItem[],
    customerCoords?: Coordinates | null,
  ): Promise<{
    eligibleStores: EligibleStoreCandidate[];
    storesConsideredCount: number;
    storesWithoutStock: Array<{ storeCode: string; storeName: string; missingCount: number }>;
  }> {
    const activeStores = await this.prisma.store.findMany({
      where: { status: StoreStatus.ACTIVE },
      select: {
        id: true,
        code: true,
        name: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { code: 'asc' },
    });

    const eligibleStores: EligibleStoreCandidate[] = [];
    const storesWithoutStock: Array<{
      storeCode: string;
      storeName: string;
      missingCount: number;
    }> = [];

    const hasValidCustomerCoords =
      customerCoords && this.storeDistanceService.isValidCoordinates(customerCoords);

    for (const store of activeStores) {
      const avail = await this.stockAvailabilityService.checkStoreAvailability(store.id, items);

      if (!avail.hasCompleteStock) {
        storesWithoutStock.push({
          storeCode: store.code,
          storeName: store.name,
          missingCount: avail.unavailableItems.length,
        });
        continue;
      }

      let distanceKm: number | null = null;
      const storeLat = store.latitude ? Number(store.latitude) : null;
      const storeLon = store.longitude ? Number(store.longitude) : null;

      if (
        hasValidCustomerCoords &&
        storeLat !== null &&
        storeLon !== null &&
        this.storeDistanceService.isValidCoordinates({ latitude: storeLat, longitude: storeLon })
      ) {
        distanceKm = this.storeDistanceService.calculateDistanceKm(customerCoords, {
          latitude: storeLat,
          longitude: storeLon,
        });
      }

      eligibleStores.push({
        storeId: store.id,
        storeCode: store.code,
        storeName: store.name,
        distanceKm,
        latitude: storeLat,
        longitude: storeLon,
      });
    }

    // Sort order:
    // 1. If distance is available for both, smallest distance first
    // 2. If one has distance and other does not, distance present ranks first
    // 3. Stable tie-breaker: storeCode ascending
    eligibleStores.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        return a.storeCode.localeCompare(b.storeCode);
      }
      if (a.distanceKm !== null && b.distanceKm === null) {
        return -1;
      }
      if (a.distanceKm === null && b.distanceKm !== null) {
        return 1;
      }
      return a.storeCode.localeCompare(b.storeCode);
    });

    return {
      eligibleStores,
      storesConsideredCount: activeStores.length,
      storesWithoutStock,
    };
  }
}
