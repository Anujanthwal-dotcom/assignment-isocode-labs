import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryAdjustmentDto } from './inventory.dto';
import { InventoryMovementType, MedicineStatus, StoreStatus } from '@prisma/client';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async adjustStock(user: { id: string }, dto: InventoryAdjustmentDto) {
    if (dto.quantityChange === 0) {
      throw new BadRequestException({
        code: 'INVALID_ADJUSTMENT_QUANTITY',
        message: 'Quantity change cannot be zero.',
      });
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'Reason is required for inventory adjustments.',
      });
    }

    // 1. Verify Medicine
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: `Medicine with ID '${dto.medicineId}' not found.`,
      });
    }

    if (medicine.status !== MedicineStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'INACTIVE_MEDICINE',
        message: 'Cannot adjust stock for an inactive medicine.',
      });
    }

    // 2. Verify Location
    let storeId: string | null = null;
    let warehouseId: string | null = null;

    if (dto.locationType === 'STORE') {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.locationId },
      });
      if (!store) {
        throw new NotFoundException({
          code: 'LOCATION_NOT_FOUND',
          message: `Store with ID '${dto.locationId}' not found.`,
        });
      }
      if (store.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException({
          code: 'INACTIVE_LOCATION',
          message: 'Cannot adjust stock for an inactive store.',
        });
      }
      storeId = store.id;
    } else {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: dto.locationId },
      });
      if (!warehouse) {
        throw new NotFoundException({
          code: 'LOCATION_NOT_FOUND',
          message: `Warehouse with ID '${dto.locationId}' not found.`,
        });
      }
      if (warehouse.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException({
          code: 'INACTIVE_LOCATION',
          message: 'Cannot adjust stock for an inactive warehouse.',
        });
      }
      warehouseId = warehouse.id;
    }

    // 3. Perform atomic adjustment transaction with row-level locking
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock balance row using raw query if existing
      let currentBalance: { id: string; quantity: number; reorderLevel: number } | null = null;

      if (storeId) {
        const rows = await tx.$queryRaw<
          Array<{ id: string; quantity: number; reorderLevel: number }>
        >`
          SELECT id, quantity, "reorderLevel"
          FROM "inventory_balances"
          WHERE "medicineId" = ${dto.medicineId}::uuid AND "storeId" = ${storeId}::uuid
          FOR UPDATE
        `;
        if (rows.length > 0) currentBalance = rows[0];
      } else if (warehouseId) {
        const rows = await tx.$queryRaw<
          Array<{ id: string; quantity: number; reorderLevel: number }>
        >`
          SELECT id, quantity, "reorderLevel"
          FROM "inventory_balances"
          WHERE "medicineId" = ${dto.medicineId}::uuid AND "warehouseId" = ${warehouseId}::uuid
          FOR UPDATE
        `;
        if (rows.length > 0) currentBalance = rows[0];
      }

      const quantityBefore = currentBalance ? currentBalance.quantity : 0;
      const quantityAfter = quantityBefore + dto.quantityChange;

      if (quantityAfter < 0) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'NEGATIVE_INVENTORY_NOT_ALLOWED',
          message: 'The adjustment would result in negative inventory.',
        });
      }

      let updatedBalance;
      if (currentBalance) {
        updatedBalance = await tx.inventoryBalance.update({
          where: { id: currentBalance.id },
          data: { quantity: quantityAfter },
        });
      } else {
        updatedBalance = await tx.inventoryBalance.create({
          data: {
            medicineId: dto.medicineId,
            storeId,
            warehouseId,
            quantity: quantityAfter,
            reorderLevel: 10,
          },
        });
      }

      // Record InventoryMovement
      const movement = await tx.inventoryMovement.create({
        data: {
          medicineId: dto.medicineId,
          storeId,
          warehouseId,
          movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
          quantityBefore,
          quantityChange: dto.quantityChange,
          quantityAfter,
          reason: dto.reason.trim(),
          performedByUserId: user.id,
        },
      });

      return { updatedBalance, movement };
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'INVENTORY_ADJUSTED',
      resourceType: 'InventoryBalance',
      resourceId: result.updatedBalance.id,
      metadata: {
        medicineId: dto.medicineId,
        locationType: dto.locationType,
        locationId: dto.locationId,
        quantityChange: dto.quantityChange,
        quantityBefore: result.movement.quantityBefore,
        quantityAfter: result.movement.quantityAfter,
        reason: dto.reason,
      },
    });

    return {
      balance: result.updatedBalance,
      movement: result.movement,
    };
  }
}
