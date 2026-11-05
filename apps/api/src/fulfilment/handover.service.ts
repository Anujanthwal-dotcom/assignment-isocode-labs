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
import { RefillsService } from '../refills/refills.service';
import {
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  StockReservationStatus,
  InventoryMovementType,
  H1RegisterStatus,
  HandoverType,
  Prisma,
} from '@prisma/client';

export interface RecordHandoverParams {
  orderId: string;
  storeId: string;
  pharmacistUserId: string;
  handoverType: HandoverType;
  recipientName: string;
  recipientPhone?: string;
  deliveryPartnerName?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface RecordCodCollectionParams {
  orderId: string;
  storeId: string;
  pharmacistUserId: string;
  amount: number;
  paymentReference?: string;
}

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly refillsService: RefillsService,
  ) {}

  /**
   * Records handover of a packed, invoiced order to delivery partner or customer collection:
   * Safety Invariants Enforced in One Transaction:
   * 1. Physical on-hand stock is decremented (`InventoryBalance.quantity -= reservedQuantity`).
   * 2. Active stock reservations are marked `CONSUMED` (can never be released again).
   * 3. Append-only `STOCK_DISPENSED` inventory movements recorded.
   * 4. Schedule H1 register entries transitioned from `PENDING_FULFILLMENT` to `COMPLETED`.
   * 5. Handover record created (idempotent, prevents duplicate handovers).
   * 6. Order transitioned to `HANDED_OVER`.
   */
  async recordHandover(params: RecordHandoverParams) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        payment: true,
        stockReservations: {
          where: { status: StockReservationStatus.ACTIVE },
        },
        items: {
          include: {
            h1RegisterEntries: {
              where: { status: H1RegisterStatus.PENDING_FULFILLMENT },
            },
          },
        },
        handover: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${params.orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== params.storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (order.status !== OrderStatus.READY_FOR_HANDOVER) {
      throw new BadRequestException(
        `Cannot record handover for order with status '${order.status}'. Order must be READY_FOR_HANDOVER.`,
      );
    }

    if (order.handover) {
      throw new BadRequestException('Handover record already exists for this order.');
    }

    if (order.stockReservations.length === 0) {
      throw new UnprocessableEntityException('No active stock reservations found to dispense.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Decrement physical inventory and consume reservations
      for (const res of order.stockReservations) {
        const currentBalance = await tx.inventoryBalance.findUnique({
          where: {
            medicineId_storeId: { medicineId: res.medicineId, storeId: res.storeId },
          },
        });

        if (!currentBalance || currentBalance.quantity < res.quantity) {
          throw new Error(
            `Insufficient physical inventory to dispense medicine ${res.medicineId}. Current: ${currentBalance?.quantity || 0}, Required: ${res.quantity}.`,
          );
        }

        const quantityBefore = currentBalance.quantity;
        const quantityAfter = quantityBefore - res.quantity;

        // Decrement physical stock
        await tx.inventoryBalance.update({
          where: { id: currentBalance.id },
          data: { quantity: quantityAfter },
        });

        // Mark reservation as CONSUMED
        await tx.stockReservation.update({
          where: { id: res.id },
          data: {
            status: StockReservationStatus.CONSUMED,
            consumedAt: now,
          },
        });

        // Append-only dispense movement
        await tx.inventoryMovement.create({
          data: {
            medicineId: res.medicineId,
            storeId: res.storeId,
            movementType: InventoryMovementType.STOCK_DISPENSED,
            quantityBefore,
            quantityChange: -res.quantity,
            quantityAfter,
            reason: `Order ${order.orderNumber} handed over / dispensed (${params.handoverType})`,
            referenceId: res.id,
            performedByUserId: params.pharmacistUserId,
          },
        });
      }

      // 2. Complete Schedule H1 statutory register entries
      for (const item of order.items) {
        for (const h1 of item.h1RegisterEntries) {
          await tx.h1RegisterEntry.update({
            where: { id: h1.id },
            data: { status: H1RegisterStatus.COMPLETED },
          });
        }
      }

      // 3. Create handover record
      const handover = await tx.orderHandover.create({
        data: {
          orderId: order.id,
          storeId: params.storeId,
          handoverType: params.handoverType,
          handedOverByUserId: params.pharmacistUserId,
          recipientName: params.recipientName,
          recipientPhone: params.recipientPhone || null,
          deliveryPartnerName: params.deliveryPartnerName || null,
          referenceNumber: params.referenceNumber || null,
          notes: params.notes || null,
          handedOverAt: now,
        },
      });

      // 4. Update order status to HANDED_OVER
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.HANDED_OVER },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: OrderStatus.READY_FOR_HANDOVER,
          newStatus: OrderStatus.HANDED_OVER,
          changedByUserId: params.pharmacistUserId,
          note: `Handed over via ${params.handoverType} to ${params.recipientName}${
            params.deliveryPartnerName ? ` (${params.deliveryPartnerName})` : ''
          }. Physical inventory dispensed.`,
        },
      });

      return handover;
    });

    await this.auditService.record({
      actorUserId: params.pharmacistUserId,
      action: 'ORDER_HANDED_OVER',
      resourceType: 'Order',
      resourceId: order.id,
      metadata: {
        storeId: params.storeId,
        handoverType: params.handoverType,
        recipientName: params.recipientName,
        reservationsConsumed: order.stockReservations.length,
      },
    });

    // Phase 7 Invariant: Refill calculation triggers strictly upon actual physical dispensing
    try {
      await this.refillsService.generateEstimatesForHandedOverOrder(order.id, now);
    } catch (err: any) {
      this.logger.error(`Failed to generate refill estimates for handed-over order ${order.id}: ${err.message}`);
    }

    return result;
  }

  /**
   * Controlled explicit action to record COD payment collection at handover.
   * Invariant: Collected amount MUST equal order total due. Prevents duplicate collection.
   */
  async recordCodCollection(params: RecordCodCollectionParams) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: { payment: true, codCollection: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${params.orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== params.storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (order.paymentMethod !== OrderPaymentMethod.COD) {
      throw new BadRequestException('Cannot record COD collection for a non-COD order.');
    }

    if (order.payment?.status === OrderPaymentStatus.SUCCESS || order.codCollection) {
      throw new BadRequestException('COD payment has already been collected for this order.');
    }

    const orderTotal = Number(order.totalAmount);
    if (Math.abs(params.amount - orderTotal) > 0.01) {
      throw new UnprocessableEntityException(
        `Collected amount (₹${params.amount.toFixed(2)}) must match the exact total due (₹${orderTotal.toFixed(2)}).`,
      );
    }

    const now = new Date();

    const collection = await this.prisma.$transaction(async (tx) => {
      // 1. Record COD collection entity
      const codRecord = await tx.orderCodCollection.create({
        data: {
          orderId: order.id,
          collectedAmount: new Prisma.Decimal(params.amount),
          paymentReference: params.paymentReference || null,
          collectedByUserId: params.pharmacistUserId,
          collectedAt: now,
        },
      });

      // 2. Update order payment status to SUCCESS
      if (order.payment) {
        const fallbackRef = `COD-${order.orderNumber}-${now.getTime()}`;
        const refToUse = params.paymentReference
          ? `${params.paymentReference}-${order.orderNumber}`
          : fallbackRef;

        await tx.orderPayment.update({
          where: { id: order.payment.id },
          data: {
            status: OrderPaymentStatus.SUCCESS,
            transactionReference: refToUse,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: OrderPaymentStatus.SUCCESS },
      });

      return codRecord;
    });

    await this.auditService.record({
      actorUserId: params.pharmacistUserId,
      action: 'COD_PAYMENT_COLLECTED',
      resourceType: 'Order',
      resourceId: order.id,
      metadata: {
        amount: params.amount,
        reference: params.paymentReference,
        storeId: params.storeId,
      },
    });

    return collection;
  }
}
