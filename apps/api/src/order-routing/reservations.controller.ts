import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, StockReservationStatus } from '@prisma/client';
import { StockReservationService } from './stock-reservation.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin Inventory Reservations')
@Controller('admin/inventory/reservations')
@ApiBearerAuth()
export class ReservationsController {
  constructor(
    private readonly stockReservationService: StockReservationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List stock reservations across stores' })
  async listReservations(
    @Query('status') status?: StockReservationStatus,
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const limitNum = Math.min(100, Math.max(1, limit ? parseInt(limit, 10) : 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;

    const [total, items] = await Promise.all([
      this.prisma.stockReservation.count({ where }),
      this.prisma.stockReservation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, code: true, name: true } },
          medicine: { select: { id: true, name: true, sku: true, strength: true } },
          order: { select: { id: true, orderNumber: true, status: true } },
        },
      }),
    ]);

    return {
      data: items.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        orderStatus: r.order.status,
        orderItemId: r.orderItemId,
        storeId: r.storeId,
        storeCode: r.store.code,
        storeName: r.store.name,
        medicineId: r.medicineId,
        medicineName: r.medicine.name,
        sku: r.medicine.sku,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt,
        reservedAt: r.reservedAt,
        releasedAt: r.releasedAt,
        consumedAt: r.consumedAt,
        releaseReason: r.releaseReason,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  @Get(':reservationId')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get stock reservation details' })
  async getReservation(@Param('reservationId') reservationId: string) {
    const r = await this.prisma.stockReservation.findUnique({
      where: { id: reservationId },
      include: {
        store: true,
        medicine: true,
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    if (!r) {
      throw new Error('Reservation not found.');
    }

    return {
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      orderStatus: r.order.status,
      orderItemId: r.orderItemId,
      storeId: r.storeId,
      storeCode: r.store.code,
      storeName: r.store.name,
      medicineId: r.medicineId,
      medicineName: r.medicine.name,
      sku: r.medicine.sku,
      quantity: r.quantity,
      status: r.status,
      expiresAt: r.expiresAt,
      reservedAt: r.reservedAt,
      releasedAt: r.releasedAt,
      consumedAt: r.consumedAt,
      releaseReason: r.releaseReason,
    };
  }

  @Post(':reservationId/release')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually release an active stock reservation' })
  async releaseReservation(
    @Param('reservationId') reservationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const res = await this.prisma.stockReservation.findUnique({
      where: { id: reservationId },
    });

    if (!res) {
      throw new Error('Reservation not found.');
    }

    await this.stockReservationService.releaseReservationsForOrder(
      res.orderId,
      'Admin manual reservation release',
      userId,
    );

    return { success: true, message: 'Reservation released successfully.' };
  }
}
