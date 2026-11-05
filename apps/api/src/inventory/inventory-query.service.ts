import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryListQueryDto } from './inventory.dto';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class InventoryQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventory(user: { id: string; role: UserRole }, query: InventoryListQueryDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'Customers are not permitted to access inventory data.',
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
          message: 'Pharmacists cannot view warehouse inventory.',
        });
      }

      if (query.storeId && query.storeId !== pharmacistProfile.storeId) {
        throw new ForbiddenException({
          code: 'LOCATION_ACCESS_DENIED',
          message: 'You are not authorized to access this inventory location.',
        });
      }

      effectiveStoreId = pharmacistProfile.storeId;
      effectiveWarehouseId = undefined;
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Build SQL query to support column-to-column comparisons (quantity vs reorderLevel)
    // and accurate UNKNOWN status
    const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];

    if (effectiveStoreId) {
      conditions.push(Prisma.sql`b."storeId" = ${effectiveStoreId}::uuid`);
    } else if (effectiveWarehouseId) {
      conditions.push(Prisma.sql`b."warehouseId" = ${effectiveWarehouseId}::uuid`);
    }

    if (query.search && query.search.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        Prisma.sql`(m."name" ILIKE ${searchTerm} OR m."sku" ILIKE ${searchTerm} OR m."genericName" ILIKE ${searchTerm} OR m."brandName" ILIKE ${searchTerm})`,
      );
    }

    if (query.stockStatus === 'OUT_OF_STOCK') {
      conditions.push(Prisma.sql`b."quantity" = 0`);
    } else if (query.stockStatus === 'LOW_STOCK') {
      conditions.push(Prisma.sql`b."quantity" > 0 AND b."quantity" <= b."reorderLevel"`);
    } else if (query.stockStatus === 'IN_STOCK') {
      conditions.push(Prisma.sql`b."quantity" > b."reorderLevel"`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    // Order By
    let orderSql = Prisma.sql`ORDER BY b."updatedAt" DESC`;
    if (query.sortBy === 'quantity') {
      orderSql =
        query.sortOrder === 'asc'
          ? Prisma.sql`ORDER BY b."quantity" ASC`
          : Prisma.sql`ORDER BY b."quantity" DESC`;
    } else if (query.sortBy === 'medicineName') {
      orderSql =
        query.sortOrder === 'asc'
          ? Prisma.sql`ORDER BY m."name" ASC`
          : Prisma.sql`ORDER BY m."name" DESC`;
    }

    // Total Count
    const countResult: Array<{ count: bigint }> = await this.prisma.$queryRaw`
      SELECT COUNT(*)::bigint as count
      FROM "inventory_balances" b
      INNER JOIN "medicines" m ON b."medicineId" = m."id"
      LEFT JOIN "stores" s ON b."storeId" = s."id"
      LEFT JOIN "warehouses" w ON b."warehouseId" = w."id"
      ${whereClause}
    `;
    const total = Number(countResult[0]?.count || 0);

    // Records
    const records: Array<{
      id: string;
      medicineId: string;
      storeId: string | null;
      warehouseId: string | null;
      quantity: number;
      reorderLevel: number;
      updatedAt: Date;
      createdAt: Date;
      medicine_sku: string;
      medicine_name: string;
      medicine_brand: string | null;
      medicine_generic: string | null;
      medicine_strength: string | null;
      medicine_form: string | null;
      medicine_pack: string | null;
      medicine_mrp: string;
      medicine_schedule: string;
      medicine_status: string;
      store_code: string | null;
      store_name: string | null;
      store_city: string | null;
      warehouse_code: string | null;
      warehouse_name: string | null;
      warehouse_city: string | null;
    }> = await this.prisma.$queryRaw`
      SELECT 
        b."id",
        b."medicineId",
        b."storeId",
        b."warehouseId",
        b."quantity",
        b."reorderLevel",
        b."updatedAt",
        b."createdAt",
        m."sku" as medicine_sku,
        m."name" as medicine_name,
        m."brandName" as medicine_brand,
        m."genericName" as medicine_generic,
        m."strength" as medicine_strength,
        m."dosageForm" as medicine_form,
        m."packSize" as medicine_pack,
        m."mrp"::text as medicine_mrp,
        m."schedule"::text as medicine_schedule,
        m."status"::text as medicine_status,
        s."code" as store_code,
        s."name" as store_name,
        s."city" as store_city,
        w."code" as warehouse_code,
        w."name" as warehouse_name,
        w."city" as warehouse_city
      FROM "inventory_balances" b
      INNER JOIN "medicines" m ON b."medicineId" = m."id"
      LEFT JOIN "stores" s ON b."storeId" = s."id"
      LEFT JOIN "warehouses" w ON b."warehouseId" = w."id"
      ${whereClause}
      ${orderSql}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const data = records.map((r) => {
      let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' = 'IN_STOCK';
      if (r.quantity === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (r.quantity <= r.reorderLevel) {
        stockStatus = 'LOW_STOCK';
      }

      return {
        id: r.id,
        medicineId: r.medicineId,
        storeId: r.storeId,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
        reorderLevel: r.reorderLevel,
        stockStatus,
        updatedAt: r.updatedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        medicine: {
          id: r.medicineId,
          sku: r.medicine_sku,
          name: r.medicine_name,
          brandName: r.medicine_brand,
          genericName: r.medicine_generic,
          strength: r.medicine_strength,
          dosageForm: r.medicine_form,
          packSize: r.medicine_pack,
          schedule: r.medicine_schedule,
          mrp: parseFloat(r.medicine_mrp),
          status: r.medicine_status,
        },
        location: {
          id: (r.storeId || r.warehouseId) as string,
          type: r.storeId ? 'STORE' : 'WAREHOUSE',
          code: (r.store_code || r.warehouse_code) as string,
          name: (r.store_name || r.warehouse_name) as string,
          city: (r.store_city || r.warehouse_city) as string,
        },
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary() {
    const [
      activeMedicinesCount,
      totalBalancesCount,
      unitsSumResult,
      lowStockResult,
      outOfStockCount,
      activeStoresCount,
      activeWarehousesCount,
    ] = await Promise.all([
      this.prisma.medicine.count({ where: { status: 'ACTIVE' } }),
      this.prisma.inventoryBalance.count(),
      this.prisma.inventoryBalance.aggregate({
        _sum: { quantity: true },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "inventory_balances"
        WHERE "quantity" > 0 AND "quantity" <= "reorderLevel"
      `,
      this.prisma.inventoryBalance.count({ where: { quantity: 0 } }),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
      this.prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
    ]);

    const totalActiveLocations = activeStoresCount + activeWarehousesCount;
    const theoreticalCombinations = activeMedicinesCount * totalActiveLocations;
    const unknownStockCount = Math.max(0, theoreticalCombinations - totalBalancesCount);

    return {
      totalActiveMedicines: activeMedicinesCount,
      totalInventoryBalances: totalBalancesCount,
      lowStockCount: Number(lowStockResult[0]?.count || 0),
      outOfStockCount,
      unknownStockCount,
      totalStockUnits: unitsSumResult._sum.quantity || 0,
    };
  }
}
