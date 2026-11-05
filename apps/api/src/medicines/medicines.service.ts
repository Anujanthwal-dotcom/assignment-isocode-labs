import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMedicineDto, UpdateMedicineDto, ListMedicinesQueryDto } from './medicines.dto';
import { MedicineStatus, Prisma, UserRole } from '@prisma/client';
import { normalizeSku, isValidSku } from '@pharmacy/validation';

@Injectable()
export class MedicinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateMedicineDto, userId: string) {
    const normalizedSku = normalizeSku(dto.sku);

    if (!isValidSku(normalizedSku)) {
      throw new BadRequestException({
        code: 'INVALID_MEDICINE_SKU',
        message:
          'SKU must be 3-64 characters and contain only letters, numbers, hyphens or underscores.',
      });
    }

    const existing = await this.prisma.medicine.findUnique({
      where: { sku: normalizedSku },
    });

    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_MEDICINE_SKU',
        message: `Medicine with SKU '${normalizedSku}' already exists.`,
      });
    }

    const medicine = await this.prisma.medicine.create({
      data: {
        sku: normalizedSku,
        name: dto.name.trim(),
        brandName: dto.brandName?.trim() || null,
        genericName: dto.genericName?.trim() || null,
        manufacturer: dto.manufacturer?.trim() || null,
        strength: dto.strength?.trim() || null,
        dosageForm: dto.dosageForm?.trim() || null,
        packSize: dto.packSize?.trim() || null,
        schedule: dto.schedule || 'UNKNOWN',
        mrp: new Prisma.Decimal(dto.mrp),
        status: MedicineStatus.ACTIVE,
      },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'MEDICINE_CREATED',
      resourceType: 'Medicine',
      resourceId: medicine.id,
      metadata: { sku: medicine.sku, name: medicine.name, mrp: dto.mrp },
    });

    return {
      ...medicine,
      mrp: Number(medicine.mrp),
    };
  }

  async findAll(query: ListMedicinesQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.schedule) {
      where.schedule = query.schedule;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { genericName: { contains: term, mode: 'insensitive' } },
        { brandName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.MedicineOrderByWithRelationInput = {
      [query.sortBy || 'name']: query.sortOrder || 'asc',
    };

    const [total, medicines] = await Promise.all([
      this.prisma.medicine.count({ where }),
      this.prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const formatted = medicines.map((m) => ({
      ...m,
      mrp: Number(m.mrp),
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

  async findById(id: string, user: { id: string; role: UserRole }) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: `Medicine with ID '${id}' not found.`,
      });
    }

    let balancesWhere: Prisma.InventoryBalanceWhereInput = { medicineId: id };

    if (user.role === UserRole.PHARMACIST) {
      const pharmacistProfile = await this.prisma.pharmacistProfile.findUnique({
        where: { userId: user.id },
      });

      if (!pharmacistProfile) {
        throw new NotFoundException('Pharmacist profile not found.');
      }

      balancesWhere = {
        medicineId: id,
        storeId: pharmacistProfile.storeId,
      };
    }

    const balances = await this.prisma.inventoryBalance.findMany({
      where: balancesWhere,
      include: {
        store: { select: { id: true, code: true, name: true, city: true } },
        warehouse: { select: { id: true, code: true, name: true, city: true } },
      },
    });

    return {
      ...medicine,
      mrp: Number(medicine.mrp),
      inventoryBalances: balances.map((b) => ({
        id: b.id,
        locationType: b.storeId ? 'STORE' : 'WAREHOUSE',
        locationId: b.storeId || b.warehouseId,
        locationName: b.store?.name || b.warehouse?.name,
        locationCode: b.store?.code || b.warehouse?.code,
        city: b.store?.city || b.warehouse?.city,
        quantity: b.quantity,
        reorderLevel: b.reorderLevel,
        updatedAt: b.updatedAt,
      })),
    };
  }

  async update(id: string, dto: UpdateMedicineDto, userId: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: `Medicine with ID '${id}' not found.`,
      });
    }

    const data: Prisma.MedicineUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.brandName !== undefined) data.brandName = dto.brandName ? dto.brandName.trim() : null;
    if (dto.genericName !== undefined)
      data.genericName = dto.genericName ? dto.genericName.trim() : null;
    if (dto.manufacturer !== undefined)
      data.manufacturer = dto.manufacturer ? dto.manufacturer.trim() : null;
    if (dto.strength !== undefined) data.strength = dto.strength ? dto.strength.trim() : null;
    if (dto.dosageForm !== undefined)
      data.dosageForm = dto.dosageForm ? dto.dosageForm.trim() : null;
    if (dto.packSize !== undefined) data.packSize = dto.packSize ? dto.packSize.trim() : null;
    if (dto.schedule !== undefined) data.schedule = dto.schedule;
    if (dto.mrp !== undefined) data.mrp = new Prisma.Decimal(dto.mrp);

    const updated = await this.prisma.medicine.update({
      where: { id },
      data,
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'MEDICINE_UPDATED',
      resourceType: 'Medicine',
      resourceId: updated.id,
      metadata: { changes: { ...dto } as Prisma.InputJsonObject },
    });

    return {
      ...updated,
      mrp: Number(updated.mrp),
    };
  }

  async updateStatus(id: string, status: MedicineStatus, userId: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: `Medicine with ID '${id}' not found.`,
      });
    }

    const updated = await this.prisma.medicine.update({
      where: { id },
      data: { status },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'MEDICINE_STATUS_CHANGED',
      resourceType: 'Medicine',
      resourceId: updated.id,
      metadata: { previousStatus: medicine.status, newStatus: status },
    });

    return {
      ...updated,
      mrp: Number(updated.mrp),
    };
  }
}
