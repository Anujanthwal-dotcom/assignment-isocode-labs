import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatusService } from '../orders/order-status.service';
import { OrderStatus, PickingItemStatus, StockReservationStatus } from '@prisma/client';

@Injectable()
export class PickingService {
  private readonly logger = new Logger(PickingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Initializes picking for an order in STOCK_RESERVED state.
   * Creates OrderItemPicking checklist rows for approved items and transitions order to PICKING.
   */
  async startPicking(orderId: string, storeId: string, pharmacistUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
            picking: true,
          },
        },
        stockReservations: {
          where: { status: StockReservationStatus.ACTIVE },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (order.status !== OrderStatus.STOCK_RESERVED && order.status !== OrderStatus.PICKING) {
      throw new BadRequestException(
        `Cannot start picking for order in status '${order.status}'. Must be STOCK_RESERVED.`,
      );
    }

    if (order.stockReservations.length === 0) {
      throw new UnprocessableEntityException('No active stock reservations found for this order.');
    }

    // Filter approved items
    const approvedItems = order.items.filter(
      (item) =>
        item.reviews[0]?.status === 'APPROVED' &&
        item.status !== 'REJECTED' &&
        item.status !== 'REMOVED',
    );

    // Create picking items if not already existing
    await this.prisma.$transaction(async (tx) => {
      for (const item of approvedItems) {
        if (!item.picking) {
          await tx.orderItemPicking.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              medicineId: item.medicineId,
              quantityRequired: item.quantity,
              quantityPicked: 0,
              status: PickingItemStatus.PENDING,
            },
          });
        }
      }

      if (order.status === OrderStatus.STOCK_RESERVED) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PICKING },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: OrderStatus.STOCK_RESERVED,
            newStatus: OrderStatus.PICKING,
            changedByUserId: pharmacistUserId,
            note: 'Store staff initiated medicine picking.',
          },
        });
      }
    });

    await this.auditService.record({
      actorUserId: pharmacistUserId,
      action: 'PICKING_STARTED',
      resourceType: 'Order',
      resourceId: order.id,
      metadata: { storeId, itemCount: approvedItems.length },
    });

    return { success: true, status: OrderStatus.PICKING };
  }

  /**
   * Confirms picking for an individual item.
   * Picker cannot pick more than reserved quantity or substitute unapproved medicine.
   */
  async confirmItemPicked(
    orderId: string,
    orderItemId: string,
    quantityPicked: number,
    storeId: string,
    pharmacistUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, fulfilmentStoreId: true, status: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (order.status !== OrderStatus.PICKING) {
      throw new BadRequestException('Order must be in PICKING status to confirm picked items.');
    }

    const pickingItem = await this.prisma.orderItemPicking.findUnique({
      where: { orderItemId },
      include: { medicine: true },
    });

    if (!pickingItem || pickingItem.orderId !== orderId) {
      throw new NotFoundException(`Picking record for item ${orderItemId} not found.`);
    }

    if (quantityPicked > pickingItem.quantityRequired) {
      throw new BadRequestException(
        `Picked quantity (${quantityPicked}) cannot exceed required quantity (${pickingItem.quantityRequired}).`,
      );
    }

    const updated = await this.prisma.orderItemPicking.update({
      where: { orderItemId },
      data: {
        quantityPicked,
        status:
          quantityPicked === pickingItem.quantityRequired
            ? PickingItemStatus.PICKED
            : PickingItemStatus.PENDING,
        pickedByUserId: pharmacistUserId,
        pickedAt: new Date(),
        exceptionReason: null,
      },
    });

    await this.auditService.record({
      actorUserId: pharmacistUserId,
      action: 'PICKING_ITEM_CONFIRMED',
      resourceType: 'OrderItemPicking',
      resourceId: updated.id,
      metadata: {
        orderId,
        orderItemId,
        quantityPicked,
        medicineName: pickingItem.medicine.name,
      },
    });

    return updated;
  }

  /**
   * Logs a picking exception (e.g. damaged, expired, or missing physical pack).
   * Stops fulfilment for the order until reviewed.
   */
  async reportItemException(
    orderId: string,
    orderItemId: string,
    reason: string,
    storeId: string,
    pharmacistUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, fulfilmentStoreId: true, status: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    const pickingItem = await this.prisma.orderItemPicking.findUnique({
      where: { orderItemId },
      include: { medicine: true },
    });

    if (!pickingItem || pickingItem.orderId !== orderId) {
      throw new NotFoundException(`Picking record for item ${orderItemId} not found.`);
    }

    const updated = await this.prisma.orderItemPicking.update({
      where: { orderItemId },
      data: {
        status: PickingItemStatus.EXCEPTION,
        exceptionReason: reason,
        pickedByUserId: pharmacistUserId,
        pickedAt: new Date(),
      },
    });

    await this.auditService.record({
      actorUserId: pharmacistUserId,
      action: 'PICKING_ITEM_EXCEPTION',
      resourceType: 'OrderItemPicking',
      resourceId: updated.id,
      metadata: {
        orderId,
        orderItemId,
        reason,
        medicineName: pickingItem.medicine.name,
      },
    });

    return updated;
  }

  /**
   * Gets picking checklist for an order.
   */
  async getPickingChecklist(orderId: string, storeId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customerUser: { select: { id: true, email: true, phone: true } },
        address: true,
        items: {
          include: {
            medicine: true,
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
            picking: {
              include: {
                pickedByUser: { select: { id: true, email: true } },
              },
            },
          },
        },
        stockReservations: {
          where: { status: StockReservationStatus.ACTIVE },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    // Only approved items
    const approvedItems = order.items.filter(
      (i) =>
        i.reviews[0]?.status === 'APPROVED' && i.status !== 'REJECTED' && i.status !== 'REMOVED',
    );

    const allPicked =
      approvedItems.length > 0 &&
      approvedItems.every((i) => i.picking?.status === PickingItemStatus.PICKED);

    const hasException = approvedItems.some(
      (i) => i.picking?.status === PickingItemStatus.EXCEPTION,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      allPicked,
      hasException,
      items: approvedItems.map((item) => ({
        orderItemId: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        sku: item.medicine.sku,
        strength: item.medicine.strength,
        dosageForm: item.medicine.dosageForm,
        packSize: item.medicine.packSize,
        schedule: item.medicine.schedule,
        quantityRequired: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        picking: item.picking
          ? {
              id: item.picking.id,
              quantityPicked: item.picking.quantityPicked,
              status: item.picking.status,
              exceptionReason: item.picking.exceptionReason,
              pickedByEmail: item.picking.pickedByUser?.email || null,
              pickedAt: item.picking.pickedAt,
            }
          : null,
      })),
    };
  }
}
