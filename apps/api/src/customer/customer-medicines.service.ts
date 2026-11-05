import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerListMedicinesDto } from './customer-medicines.dto';
import { MedicineStatus, Prisma } from '@prisma/client';

@Injectable()
export class CustomerMedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMedicines(dto: CustomerListMedicinesDto) {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = {
      status: MedicineStatus.ACTIVE,
    };

    if (dto.search && dto.search.trim()) {
      const q = dto.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brandName: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.MedicineOrderByWithRelationInput = {};
    if (dto.sortBy === 'mrp') {
      orderBy.mrp = dto.sortOrder || 'asc';
    } else {
      orderBy.name = dto.sortOrder || 'asc';
    }

    const [items, total] = await Promise.all([
      this.prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          sku: true,
          name: true,
          brandName: true,
          genericName: true,
          manufacturer: true,
          strength: true,
          dosageForm: true,
          packSize: true,
          schedule: true,
          mrp: true,
        },
      }),
      this.prisma.medicine.count({ where }),
    ]);

    return {
      data: items.map((m) => ({
        ...m,
        mrp: Number(m.mrp),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMedicineDetails(id: string) {
    const medicine = await this.prisma.medicine.findFirst({
      where: {
        id,
        status: MedicineStatus.ACTIVE,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        brandName: true,
        genericName: true,
        manufacturer: true,
        strength: true,
        dosageForm: true,
        packSize: true,
        schedule: true,
        mrp: true,
      },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: `Active medicine with ID '${id}' was not found.`,
      });
    }

    return {
      ...medicine,
      mrp: Number(medicine.mrp),
    };
  }
}
