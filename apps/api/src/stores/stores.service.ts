import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { Store, StoreStatus, UserRole, UserStatus, Prisma } from '@prisma/client';
import { normalizeEmail, normalizePhone } from '@pharmacy/validation';
import { CreateStoreDto, RegisterStaffDto, RegisterPharmacistDto } from './stores.dto';

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

  async listAllStoresWithCounts() {
    const stores = await this.prisma.store.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: {
            staffProfiles: true,
            fulfilmentOrders: true,
          },
        },
      },
    });

    return stores.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      city: s.city,
      address: s.address,
      latitude: s.latitude ? Number(s.latitude) : null,
      longitude: s.longitude ? Number(s.longitude) : null,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      staffCount: s._count.staffProfiles,
      ordersCount: s._count.fulfilmentOrders,
    }));
  }

  async createStore(dto: CreateStoreDto): Promise<Store> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.findByCode(code);
    if (existing) {
      throw new ConflictException(`Store with code "${code}" already exists.`);
    }

    return this.prisma.store.create({
      data: {
        code,
        name: dto.name.trim(),
        city: dto.city.trim(),
        address: dto.address.trim(),
        latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : null,
        status: dto.status || StoreStatus.ACTIVE,
      },
    });
  }

  /**
   * Safe deletion verification: Prevents deleting stores that have associated pharmacists or staff.
   */
  async deleteStore(id: string): Promise<void> {
    const [pharmacistsCount, staffCount] = await Promise.all([
      this.prisma.pharmacistProfile.count({ where: { storeId: id } }),
      this.prisma.staffProfile.count({ where: { storeId: id } }),
    ]);

    if (pharmacistsCount > 0 || staffCount > 0) {
      throw new BadRequestException('Cannot delete store that has associated staff or pharmacists.');
    }

    await this.prisma.store.delete({
      where: { id },
    });
  }

  // --- STAFF DIRECTORY (Staff belongs to a Store) ---
  async listStaff(storeId?: string) {
    const staff = await this.prisma.staffProfile.findMany({
      where: storeId ? { storeId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, phone: true, email: true, status: true, createdAt: true } },
        store: { select: { id: true, code: true, name: true, city: true } },
      },
    });

    return staff.map((sp) => ({
      id: sp.id,
      userId: sp.userId,
      fullName: sp.fullName,
      designation: sp.designation || 'Store Staff',
      phone: sp.user.phone,
      email: sp.user.email,
      status: sp.user.status,
      store: sp.store,
      createdAt: sp.createdAt.toISOString(),
    }));
  }

  async registerStaff(dto: RegisterStaffDto) {
    if (!dto.storeId) {
      throw new BadRequestException('Assigned store is required. Staff must belong to a store.');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store) {
      throw new BadRequestException('The selected store does not exist.');
    }

    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Please provide a valid 10-digit Indian mobile number.');
    }
    const normalizedEmail = normalizeEmail(dto.email);
    if (!normalizedEmail) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: normalizedPhone }, { email: normalizedEmail }],
      },
    });
    if (existing) {
      throw new ConflictException('A user with this mobile phone or email already exists.');
    }

    const initialPassword = dto.password?.trim() || 'PharmacyStaff@2026';
    const passwordHash = await argon2.hash(initialPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.STORE_STAFF,
          status: UserStatus.ACTIVE,
          phone: normalizedPhone,
          email: normalizedEmail,
          passwordHash,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          storeId: store.id,
          fullName: dto.fullName.trim(),
          designation: dto.designation?.trim() || 'Store Staff',
        },
        include: {
          store: { select: { id: true, code: true, name: true, city: true } },
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        fullName: profile.fullName,
        designation: profile.designation,
        phone: user.phone,
        email: user.email,
        status: user.status,
        store: profile.store,
        createdAt: profile.createdAt.toISOString(),
      };
    });

    return result;
  }

  // --- PHARMACIST DIRECTORY (Independent Clinical Verification Officers) ---
  async listPharmacists() {
    const pharmacists = await this.prisma.pharmacistProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, phone: true, email: true, status: true, createdAt: true } },
      },
    });

    return pharmacists.map((pp) => ({
      id: pp.id,
      userId: pp.userId,
      fullName: pp.fullName,
      registrationNumber: pp.registrationNumber || null,
      phone: pp.user.phone,
      email: pp.user.email,
      status: pp.user.status,
      clinicalScope: 'Central Prescription Verification (Independent)',
      createdAt: pp.createdAt.toISOString(),
    }));
  }

  async registerPharmacist(dto: RegisterPharmacistDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Please provide a valid 10-digit Indian mobile number.');
    }
    const normalizedEmail = normalizeEmail(dto.email);
    if (!normalizedEmail) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: normalizedPhone }, { email: normalizedEmail }],
      },
    });
    if (existing) {
      throw new ConflictException('A user with this mobile phone or email already exists.');
    }

    const initialPassword = dto.password?.trim() || 'PharmacistPass@2026';
    const passwordHash = await argon2.hash(initialPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.PHARMACIST,
          status: UserStatus.ACTIVE,
          phone: normalizedPhone,
          email: normalizedEmail,
          passwordHash,
        },
      });

      const profile = await tx.pharmacistProfile.create({
        data: {
          userId: user.id,
          storeId: null, // Pharmacists operate independently across the platform
          fullName: dto.fullName.trim(),
          registrationNumber: dto.registrationNumber?.trim() || null,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        fullName: profile.fullName,
        registrationNumber: profile.registrationNumber,
        phone: user.phone,
        email: user.email,
        status: user.status,
        clinicalScope: 'Central Prescription Verification (Independent)',
        createdAt: profile.createdAt.toISOString(),
      };
    });

    return result;
  }

  // --- CUSTOMERS DIRECTORY ---
  async listCustomers() {
    const customers = await this.prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      orderBy: { createdAt: 'desc' },
      include: {
        customerProfile: true,
        _count: {
          select: { orders: true, prescriptions: true },
        },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      fullName: c.customerProfile?.fullName || 'Customer',
      phone: c.phone,
      email: c.email,
      status: c.status,
      ordersCount: c._count.orders,
      prescriptionsCount: c._count.prescriptions,
      createdAt: c.createdAt.toISOString(),
    }));
  }
}
