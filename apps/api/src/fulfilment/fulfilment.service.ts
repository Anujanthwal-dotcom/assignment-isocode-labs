import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, StockReservationStatus, Prisma } from '@prisma/client';

@Injectable()
export class FulfilmentService {
  private readonly logger = new Logger(FulfilmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves store-scoped fulfilment queue for the authenticated store pharmacist.
   */
  async getStoreFulfilmentQueue(
    storeId: string,
    query?: { status?: string; page?: number; limit?: number; search?: string },
  ) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      fulfilmentStoreId: storeId,
    };

    if (query?.status) {
      where.status = query.status as OrderStatus;
    } else {
      where.status = {
        in: [
          OrderStatus.STOCK_RESERVED,
          OrderStatus.PICKING,
          OrderStatus.PACKED,
          OrderStatus.READY_FOR_HANDOVER,
          OrderStatus.HANDED_OVER,
          OrderStatus.FULFILMENT_CANCELLED,
        ],
      };
    }

    if (query?.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerUser: { phone: { contains: query.search } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          customerUser: {
            select: {
              id: true,
              phone: true,
              customerProfile: { select: { fullName: true } },
            },
          },
          items: true,
          stockReservations: {
            where: { status: StockReservationStatus.ACTIVE },
            take: 1,
          },
          routingDecisions: {
            orderBy: { routedAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: orders.map((o) => {
        const activeRes = o.stockReservations[0];
        const latestRouting = o.routingDecisions[0];
        return {
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.customerUser.customerProfile?.fullName || 'Customer',
          customerPhone: o.customerUser.phone || null,
          placedAt: o.placedAt.toISOString(),
          itemCount: o.items.length,
          totalAmount: Number(o.totalAmount),
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          storeId: o.fulfilmentStoreId,
          reservationExpiresAt: activeRes ? activeRes.expiresAt.toISOString() : null,
          routingMethod: latestRouting?.routingMethod || null,
          distanceKm: latestRouting?.distanceKm ? Number(latestRouting.distanceKm) : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves order fulfilment detail for store pharmacist.
   */
  async getOrderFulfilmentDetail(orderId: string, storeId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customerUser: {
          select: {
            id: true,
            email: true,
            phone: true,
            customerProfile: { select: { fullName: true } },
          },
        },
        address: true,
        items: {
          include: {
            medicine: true,
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
            picking: true,
          },
        },
        payment: true,
        invoice: true,
        handover: true,
        codCollection: true,
        stockReservations: {
          where: { status: StockReservationStatus.ACTIVE },
        },
        routingDecisions: {
          orderBy: { routedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    const activeRes = order.stockReservations[0];
    const latestRouting = order.routingDecisions[0];

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
      customer: {
        name: order.customerUser.customerProfile?.fullName || 'Customer',
        phone: order.customerUser.phone,
        email: order.customerUser.email,
      },
      deliveryAddress: order.addressSnapshot,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      totalAmount: Number(order.totalAmount),
      reservationExpiresAt: activeRes ? activeRes.expiresAt.toISOString() : null,
      routingMethod: latestRouting?.routingMethod || null,
      distanceKm: latestRouting?.distanceKm ? Number(latestRouting.distanceKm) : null,
      items: order.items
        .filter(
          (i) =>
            i.reviews[0]?.status === 'APPROVED' &&
            i.status !== 'REJECTED' &&
            i.status !== 'REMOVED',
        )
        .map((i) => ({
          orderItemId: i.id,
          medicineId: i.medicineId,
          medicineName: i.medicine.name,
          sku: i.medicine.sku,
          strength: i.medicine.strength,
          dosageForm: i.medicine.dosageForm,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
          pickingStatus: i.picking?.status || 'PENDING',
          quantityPicked: i.picking?.quantityPicked || 0,
          exceptionReason: i.picking?.exceptionReason || null,
        })),
      hasInvoice: !!order.invoice,
      invoiceNumber: order.invoice?.invoiceNumber || null,
      hasHandover: !!order.handover,
      handoverDetails: order.handover
        ? {
            handoverType: order.handover.handoverType,
            recipientName: order.handover.recipientName,
            recipientPhone: order.handover.recipientPhone,
            deliveryPartnerName: order.handover.deliveryPartnerName,
            referenceNumber: order.handover.referenceNumber,
            handedOverAt: order.handover.handedOverAt.toISOString(),
          }
        : null,
      codCollected: !!order.codCollection,
      codCollectedAmount: order.codCollection ? Number(order.codCollection.collectedAmount) : null,
    };
  }

  /**
   * Admin portal metrics overview.
   */
  async getAdminFulfilmentMetrics() {
    const [
      awaitingRouting,
      stockReserved,
      picking,
      packed,
      readyForHandover,
      handedOver,
      stockUnavailable,
      activeReservationsCount,
      expiredReservationsCount,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.APPROVED, OrderStatus.PARTIALLY_APPROVED, OrderStatus.ROUTING_PENDING],
          },
        },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.STOCK_RESERVED } }),
      this.prisma.order.count({ where: { status: OrderStatus.PICKING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PACKED } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY_FOR_HANDOVER } }),
      this.prisma.order.count({ where: { status: OrderStatus.HANDED_OVER } }),
      this.prisma.order.count({ where: { status: OrderStatus.STOCK_UNAVAILABLE } }),
      this.prisma.stockReservation.count({
        where: { status: StockReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
      }),
      this.prisma.stockReservation.count({
        where: { status: StockReservationStatus.EXPIRED },
      }),
    ]);

    return {
      awaitingRouting,
      stockReserved,
      picking,
      packed,
      readyForHandover,
      handedOver,
      stockUnavailable,
      activeReservationsCount,
      expiredReservationsCount,
    };
  }
}
