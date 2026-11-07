import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FulfilmentService } from './fulfilment.service';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin Fulfilment & Invoices')
@Controller('admin/fulfilment')
@ApiBearerAuth()
export class AdminFulfilmentController {
  constructor(
    private readonly fulfilmentService: FulfilmentService,
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin overview metrics of active fulfilment lifecycle' })
  async getMetrics() {
    return this.fulfilmentService.getAdminFulfilmentMetrics();
  }

  @Get('orders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all fulfilment orders across stores' })
  async listOrders(
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const limitNum = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (storeId) where.fulfilmentStoreId = storeId;
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { placedAt: 'desc' },
        include: {
          fulfilmentStore: { select: { id: true, code: true, name: true } },
          customerUser: {
            select: {
              phone: true,
              email: true,
              customerProfile: { select: { fullName: true } },
            },
          },
          items: true,
          routingDecisions: { orderBy: { routedAt: 'desc' }, take: 1 },
          stockReservations: { where: { status: 'ACTIVE' }, take: 1 },
        },
      }),
    ]);

    return {
      data: orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        customerName: o.customerUser.customerProfile?.fullName || 'Customer',
        customerPhone: o.customerUser.phone || null,
        assignedStore: o.fulfilmentStore || null,
        totalAmount: Number(o.totalAmount),
        itemCount: o.items.length,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        placedAt: o.placedAt.toISOString(),
        routingMethod: o.routingDecisions[0]?.routingMethod || null,
        distanceKm: o.routingDecisions[0]?.distanceKm
          ? Number(o.routingDecisions[0].distanceKm)
          : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Platform-wide list of issued invoices' })
  async listInvoices(
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const limitNum = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (storeId) where.storeId = storeId;

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { issuedAt: 'desc' },
        include: {
          store: { select: { id: true, code: true, name: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      }),
    ]);

    return {
      data: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        orderNumber: inv.order.orderNumber,
        storeId: inv.storeId,
        storeName: inv.store.name,
        storeCode: inv.store.code,
        total: Number(inv.total),
        paymentMethod: inv.paymentMethod,
        paymentStatus: inv.paymentStatus,
        issuedAt: inv.issuedAt.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  @Get('invoices/:orderId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full invoice detail for an order' })
  async getInvoice(@Param('orderId') orderId: string) {
    return this.invoiceService.getInvoiceByOrderId(orderId);
  }
}
