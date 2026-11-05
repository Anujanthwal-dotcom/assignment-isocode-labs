import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Store, StoreStatus } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Store | null> {
    return this.prisma.store.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Store | null> {
    return this.prisma.store.findUnique({
      where: { code },
    });
  }

  async listActiveStores(): Promise<Store[]> {
    return this.prisma.store.findMany({
      where: { status: StoreStatus.ACTIVE },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Safe deletion verification: Prevents deleting stores that have associated pharmacists.
   */
  async deleteStore(id: string): Promise<void> {
    const pharmacistsCount = await this.prisma.pharmacistProfile.count({
      where: { storeId: id },
    });

    if (pharmacistsCount > 0) {
      throw new BadRequestException('Cannot delete store that has associated pharmacists.');
    }

    await this.prisma.store.delete({
      where: { id },
    });
  }
}
