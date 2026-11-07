import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockReservationStatus } from '@prisma/client';

export interface StoreStockCheckItem {
  medicineId: string;
  quantityRequired: number;
}

export interface StoreStockAvailabilityResult {
  storeId: string;
  storeCode: string;
  storeName: string;
  hasCompleteStock: boolean;
  unavailableItems: Array<{
    medicineId: string;
    quantityRequired: number;
    onHandStock: number;
    reservedStock: number;
    availableStock: number;
  }>;
}

@Injectable()
export class StockAvailabilityService {
  private readonly logger = new Logger(StockAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates available stock for a specific medicine at a store.
   * availableStock = onHandStock - reservedStock (from ACTIVE non-expired reservations)
   */
  async getAvailableStock(storeId: string, medicineId: string): Promise<number> {
    const [balance, activeReservedAgg] = await Promise.all([
      this.prisma.inventoryBalance.findUnique({
        where: {
          medicineId_storeId: { medicineId, storeId },
        },
        select: { quantity: true },
      }),
      this.prisma.stockReservation.aggregate({
        where: {
          storeId,
          medicineId,
          status: StockReservationStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        _sum: { quantity: true },
      }),
    ]);

    const onHand = balance?.quantity || 0;
    const reserved = activeReservedAgg._sum.quantity || 0;
    return Math.max(0, onHand - reserved);
  }

  /**
   * Evaluates whether a store has sufficient available stock for all required items.
   * An order CANNOT be split across multiple stores.
   */
  async checkStoreAvailability(
    storeId: string,
    items: StoreStockCheckItem[],
  ): Promise<StoreStockAvailabilityResult> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, code: true, name: true },
    });

    if (!store) {
      throw new Error(`Store with id '${storeId}' not found.`);
    }

    const medicineIds = items.map((i) => i.medicineId);

    const [balances, activeReservations] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where: {
          storeId,
          medicineId: { in: medicineIds },
        },
        select: { medicineId: true, quantity: true },
      }),
      this.prisma.stockReservation.groupBy({
        by: ['medicineId'],
        where: {
          storeId,
          medicineId: { in: medicineIds },
          status: StockReservationStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        _sum: { quantity: true },
      }),
    ]);

    const balanceMap = new Map<string, number>(balances.map((b) => [b.medicineId, b.quantity]));
    const reservedMap = new Map<string, number>(
      activeReservations.map((r) => [r.medicineId, r._sum.quantity || 0]),
    );

    const unavailableItems: StoreStockAvailabilityResult['unavailableItems'] = [];

    for (const item of items) {
      const onHandStock = balanceMap.get(item.medicineId) || 0;
      const reservedStock = reservedMap.get(item.medicineId) || 0;
      const availableStock = Math.max(0, onHandStock - reservedStock);

      if (availableStock < item.quantityRequired) {
        unavailableItems.push({
          medicineId: item.medicineId,
          quantityRequired: item.quantityRequired,
          onHandStock,
          reservedStock,
          availableStock,
        });
      }
    }

    return {
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      hasCompleteStock: unavailableItems.length === 0,
      unavailableItems,
    };
  }
}
