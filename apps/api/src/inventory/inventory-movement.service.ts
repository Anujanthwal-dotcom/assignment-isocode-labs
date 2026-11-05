import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryMovementQueryDto } from './inventory.dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class InventoryMovementService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovements(user: { id: string; role: UserRole }, query: InventoryMovementQueryDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'Customers are not permitted to access inventory movement history.',
      });
    }

    let effectiveStoreId = query.storeId;
    let effectiveWarehouseId = query.warehouseId;

    if (user.role === UserRole.PHARMACIST) {
      const pharmacistProfile = await this.prisma.pharmacistProfile.findUnique({
        where: { userId: user.id },
      });

      if (!pharmacistProfile) {
        throw new NotFoundException('Pharmacist profile not found.');
      }

      if (query.warehouseId) {
        throw new ForbiddenException({
          code: 'LOCATION_ACCESS_DENIED',
          message: 'Pharmacists cannot view warehouse movements.',
        });
      }

      if (query.storeId && query.storeId !== pharmacistProfile.storeId) {
        throw new ForbiddenException({
          code: 'LOCATION_ACCESS_DENIED',
          message: 'You are not authorized to view movements for another store.',
        });
      }

      effectiveStoreId = pharmacistProfile.storeId;
      effectiveWarehouseId = undefined;
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {};

    if (query.medicineId) {
      where.medicineId = query.medicineId;
    }

    if (effectiveStoreId) {
      where.storeId = effectiveStoreId;
    }

    if (effectiveWarehouseId) {
      where.warehouseId = effectiveWarehouseId;
    }

    if (query.movementType) {
      where.movementType = query.movementType;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [total, movements] = await Promise.all([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: {
            select: { id: true, name: true, sku: true },
          },
          store: {
            select: { id: true, name: true, code: true, city: true },
          },
          warehouse: {
            select: { id: true, name: true, code: true, city: true },
          },
          performedByUser: {
            select: { id: true, email: true, phone: true, role: true },
          },
        },
      }),
    ]);

    const formatted = movements.map((m) => ({
      id: m.id,
      medicineId: m.medicineId,
      medicineName: m.medicine.name,
      medicineSku: m.medicine.sku,
      locationType: m.storeId ? 'STORE' : 'WAREHOUSE',
      locationId: m.storeId || m.warehouseId,
      locationName: m.store?.name || m.warehouse?.name,
      locationCode: m.store?.code || m.warehouse?.code,
      movementType: m.movementType,
      quantityBefore: m.quantityBefore,
      quantityChange: m.quantityChange,
      quantityAfter: m.quantityAfter,
      reason: m.reason,
      referenceId: m.referenceId,
      actorEmail: m.performedByUser?.email || m.performedByUser?.phone || 'System',
      actorRole: m.performedByUser?.role || null,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
