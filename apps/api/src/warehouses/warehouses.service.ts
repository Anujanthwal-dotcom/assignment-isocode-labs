import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Warehouse, StoreStatus } from '@prisma/client';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveWarehouses(): Promise<Warehouse[]> {
    return this.prisma.warehouse.findMany({
      where: { status: StoreStatus.ACTIVE },
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string): Promise<Warehouse | null> {
    return this.prisma.warehouse.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    return this.prisma.warehouse.findUnique({
      where: { code },
    });
  }
}
