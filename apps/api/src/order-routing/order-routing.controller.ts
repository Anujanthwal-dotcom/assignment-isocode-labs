import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { OrderRoutingService } from './order-routing.service';
import { StockReservationService } from './stock-reservation.service';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ManualAssignStoreDto {
  @IsUUID()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

@ApiTags('Admin Order Routing')
@Controller('admin/orders')
@ApiBearerAuth()
export class OrderRoutingController {
  constructor(
    private readonly orderRoutingService: OrderRoutingService,
    private readonly stockReservationService: StockReservationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':orderId/route')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate automatic store routing and stock reservation for an order' })
  async triggerRoute(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    return this.orderRoutingService.routeOrder(orderId, {
      triggeredByUserId: userId,
      isManual: false,
    });
  }

  @Post(':orderId/routing/retry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Retry automatic store routing for an order in STOCK_UNAVAILABLE state',
  })
  async retryRoute(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    return this.orderRoutingService.routeOrder(orderId, {
      triggeredByUserId: userId,
      isManual: false,
    });
  }

  @Post(':orderId/routing/manual-assignment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Manually assign an order to an eligible store (still validates complete stock)',
  })
  async manualAssign(
    @Param('orderId') orderId: string,
    @Body() dto: ManualAssignStoreDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderRoutingService.routeOrder(orderId, {
      triggeredByUserId: userId,
      isManual: true,
      targetStoreId: dto.storeId,
      manualReason: dto.reason,
    });
  }

  @Get(':orderId/routing')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get routing decision history and current candidate availability for an order',
  })
  async getRoutingDetails(@Param('orderId') orderId: string) {
    const [decisions, order] = await Promise.all([
      this.prisma.orderRoutingDecision.findMany({
        where: { orderId },
        orderBy: { routedAt: 'desc' },
        include: {
          store: { select: { id: true, code: true, name: true, city: true } },
          routedByUser: { select: { id: true, email: true } },
        },
      }),
      this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          fulfilmentStore: { select: { id: true, code: true, name: true } },
          stockReservations: {
            where: { status: 'ACTIVE' },
            include: { medicine: { select: { id: true, name: true, sku: true } } },
          },
        },
      }),
    ]);

    return {
      orderId,
      orderStatus: order?.status,
      assignedStore: order?.fulfilmentStore || null,
      activeReservationsCount: order?.stockReservations?.length || 0,
      decisions: decisions.map((d) => ({
        id: d.id,
        routingMethod: d.routingMethod,
        status: d.status,
        store: d.store || null,
        distanceKm: d.distanceKm ? Number(d.distanceKm) : null,
        candidateStoreIds: d.candidateStoreIds,
        failureReason: d.failureReason,
        routedByEmail: d.routedByUser?.email || null,
        routedAt: d.routedAt,
      })),
    };
  }
}
