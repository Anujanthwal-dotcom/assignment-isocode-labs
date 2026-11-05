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
import { InvoiceService } from './invoice.service';
import { OrderStatus, PickingItemStatus } from '@prisma/client';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Confirms packing completion:
   * Safety invariant: Packing CANNOT complete unless all approved items are confirmed as PICKED.
   * If any picking exception exists or items are pending, packing is blocked.
   * On successful packing, transitions order to PACKED and automatically triggers invoice generation.
   */
  async completePacking(
    orderId: string,
    storeId: string,
    pharmacistUserId: string,
    notes?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
            picking: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (order.status !== OrderStatus.PICKING && order.status !== OrderStatus.PACKED) {
      throw new BadRequestException(
        `Cannot complete packing for order with status '${order.status}'. Order must be in PICKING status.`,
      );
    }

    // Filter approved items
    const approvedItems = order.items.filter(
      (i) => i.reviews[0]?.status === 'APPROVED' && i.status !== 'REJECTED' && i.status !== 'REMOVED',
    );

    if (approvedItems.length === 0) {
      throw new UnprocessableEntityException('No approved items found to pack.');
    }

    // Check all items are PICKED
    const unpicked = approvedItems.filter(
      (i) => !i.picking || i.picking.status !== PickingItemStatus.PICKED,
    );

    if (unpicked.length > 0) {
      throw new UnprocessableEntityException(
        `Cannot complete packing. ${unpicked.length} item(s) are not fully picked or have exceptions.`,
      );
    }

    // Atomic update to PACKED and generate invoice
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PACKED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.PACKED,
          changedByUserId: pharmacistUserId,
          note: notes ? `Order packed. Notes: ${notes}` : 'Order packed and verified.',
        },
      });
    });

    await this.auditService.record({
      actorUserId: pharmacistUserId,
      action: 'ORDER_PACKED',
      resourceType: 'Order',
      resourceId: order.id,
      metadata: { storeId, itemCount: approvedItems.length, notes },
    });

    // Automatically generate invoice and transition to READY_FOR_HANDOVER
    const invoice = await this.invoiceService.generateInvoiceForOrder(
      order.id,
      storeId,
      pharmacistUserId,
    );

    return {
      success: true,
      status: OrderStatus.READY_FOR_HANDOVER,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    };
  }
}
