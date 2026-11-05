import {
  Injectable,
  Logger,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  StockReservationStatus,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';

export interface ReserveStockItemParam {
  orderItemId: string;
  medicineId: string;
  quantity: number;
}

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);
  private readonly ttlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.ttlMinutes = parseInt(
      this.configService.get<string>('STOCK_RESERVATION_TTL_MINUTES') || '30',
      10,
    );
  }

  /**
   * Concurrency-safe atomic multi-item stock reservation for an order at a specific store.
   * Uses a PostgreSQL interactive transaction with row locks (`SELECT ... FOR UPDATE`)
   * to guarantee availableStock >= quantity for every item.
   * If ANY item cannot be reserved, rolls back the entire reservation atomically.
   */
  async reserveStockForOrder(
    orderId: string,
    storeId: string,
    items: ReserveStockItemParam[],
    userId?: string,
  ): Promise<{ success: boolean; reservations: any[]; failureReason?: string }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Cannot reserve empty item list.');
    }

    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // 1. Check for any existing ACTIVE reservation for this order
          const existingReservations = await tx.stockReservation.findMany({
            where: {
              orderId,
              status: StockReservationStatus.ACTIVE,
            },
          });

          if (existingReservations.length > 0) {
            throw new Error('Order already has active stock reservations.');
          }

          // 2. Sort medicineIds deterministically to prevent PostgreSQL deadlocks on concurrent orders
          const sortedItems = [...items].sort((a, b) => a.medicineId.localeCompare(b.medicineId));

          const createdReservations: any[] = [];

          for (const item of sortedItems) {
            // Lock the inventory balance row with FOR UPDATE using raw query
            const lockedBalances: Array<{ id: string; quantity: number }> =
              await tx.$queryRaw`
                SELECT id, quantity 
                FROM inventory_balances 
                WHERE "storeId" = ${storeId}::uuid AND "medicineId" = ${item.medicineId}::uuid
                FOR UPDATE
              `;

            if (!lockedBalances || lockedBalances.length === 0) {
              throw new Error(
                `Store has no inventory record for medicine ${item.medicineId}.`,
              );
            }

            const onHand = lockedBalances[0].quantity;

            // Calculate active reserved quantity for this medicine at this store
            const reservedAgg = await tx.stockReservation.aggregate({
              where: {
                storeId,
                medicineId: item.medicineId,
                status: StockReservationStatus.ACTIVE,
                expiresAt: { gt: new Date() },
              },
              _sum: { quantity: true },
            });

            const currentReserved = reservedAgg._sum.quantity || 0;
            const available = onHand - currentReserved;

            if (available < item.quantity) {
              throw new Error(
                `Insufficient stock for medicine ${item.medicineId}. Available: ${available}, Required: ${item.quantity}.`,
              );
            }

            // Create stock reservation record
            const reservation = await tx.stockReservation.create({
              data: {
                orderId,
                orderItemId: item.orderItemId,
                storeId,
                medicineId: item.medicineId,
                quantity: item.quantity,
                status: StockReservationStatus.ACTIVE,
                expiresAt,
                reservedByUserId: userId || null,
              },
            });

            // Append-only inventory movement audit for reservation
            await tx.inventoryMovement.create({
              data: {
                medicineId: item.medicineId,
                storeId,
                movementType: InventoryMovementType.STOCK_RESERVED,
                quantityBefore: onHand,
                quantityChange: 0, // Physical stock does NOT decrease during reservation hold
                quantityAfter: onHand,
                reason: `Stock reserved for order ${orderId} (Item: ${item.orderItemId})`,
                referenceId: reservation.id,
                performedByUserId: userId || null,
              },
            });

            createdReservations.push(reservation);
          }

          return createdReservations;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 10000,
        },
      );

      this.logger.log(
        `Successfully reserved stock for order ${orderId} at store ${storeId} (${items.length} items)`,
      );

      await this.auditService.record({
        actorUserId: userId || null,
        action: 'STOCK_RESERVED',
        resourceType: 'Order',
        resourceId: orderId,
        metadata: {
          storeId,
          itemCount: items.length,
          expiresAt: expiresAt.toISOString(),
        },
      });

      return { success: true, reservations: result };
    } catch (err: any) {
      this.logger.warn(
        `Stock reservation attempt failed for order ${orderId} at store ${storeId}: ${err.message}`,
      );
      return { success: false, reservations: [], failureReason: err.message };
    }
  }

  /**
   * Releases active stock reservations for an order (e.g. upon cancellation or re-routing).
   */
  async releaseReservationsForOrder(
    orderId: string,
    reason: string,
    userId?: string,
  ): Promise<number> {
    const activeReservations = await this.prisma.stockReservation.findMany({
      where: {
        orderId,
        status: StockReservationStatus.ACTIVE,
      },
    });

    if (activeReservations.length === 0) {
      return 0;
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const res of activeReservations) {
        await tx.stockReservation.update({
          where: { id: res.id },
          data: {
            status: StockReservationStatus.RELEASED,
            releasedAt: now,
            releaseReason: reason,
          },
        });

        const balance = await tx.inventoryBalance.findUnique({
          where: {
            medicineId_storeId: { medicineId: res.medicineId, storeId: res.storeId },
          },
          select: { quantity: true },
        });

        await tx.inventoryMovement.create({
          data: {
            medicineId: res.medicineId,
            storeId: res.storeId,
            movementType: InventoryMovementType.STOCK_RESERVATION_RELEASED,
            quantityBefore: balance?.quantity || 0,
            quantityChange: 0,
            quantityAfter: balance?.quantity || 0,
            reason: `Reservation released: ${reason}`,
            referenceId: res.id,
            performedByUserId: userId || null,
          },
        });
      }
    });

    await this.auditService.record({
      actorUserId: userId || null,
      action: 'STOCK_RESERVATION_RELEASED',
      resourceType: 'Order',
      resourceId: orderId,
      metadata: { reason, count: activeReservations.length },
    });

    return activeReservations.length;
  }

  /**
   * Idempotent expiry check: Marks expired ACTIVE reservations as EXPIRED.
   */
  async processExpiredReservations(): Promise<number> {
    const expiredReservations = await this.prisma.stockReservation.findMany({
      where: {
        status: StockReservationStatus.ACTIVE,
        expiresAt: { lte: new Date() },
      },
      take: 100,
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    for (const res of expiredReservations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Check that it wasn't consumed or released concurrently
          const current = await tx.stockReservation.findUnique({
            where: { id: res.id },
          });

          if (current?.status !== StockReservationStatus.ACTIVE) {
            return;
          }

          await tx.stockReservation.update({
            where: { id: res.id },
            data: {
              status: StockReservationStatus.EXPIRED,
              releasedAt: new Date(),
              releaseReason: 'Reservation TTL expired',
            },
          });
        });

        await this.auditService.record({
          action: 'STOCK_RESERVATION_EXPIRED',
          resourceType: 'StockReservation',
          resourceId: res.id,
          metadata: { orderId: res.orderId, storeId: res.storeId },
        });
      } catch (err: any) {
        this.logger.error(`Error expiring reservation ${res.id}: ${err.message}`);
      }
    }

    return expiredReservations.length;
  }
}
