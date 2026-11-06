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
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates invoice record for an order in PACKED status:
   * Deterministic unique numbering format: INV-{STORE_CODE}-{YYYYMMDD}-{SEQUENCE}
   * Concurrency-safe and idempotent: an invoice is never generated twice for the same order.
   * On successful generation, transitions order to READY_FOR_HANDOVER.
   */
  async generateInvoiceForOrder(orderId: string, storeId: string, userId?: string) {
    // 1. Check if invoice already exists
    const existing = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: { items: true },
    });

    if (existing) {
      return existing;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        fulfilmentStore: true,
        customerUser: true,
        items: {
          include: {
            medicine: true,
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.fulfilmentStoreId !== storeId) {
      throw new ForbiddenException('Order is assigned to another fulfillment store.');
    }

    if (
      order.status !== OrderStatus.PACKED &&
      order.status !== OrderStatus.READY_FOR_HANDOVER &&
      order.status !== OrderStatus.HANDED_OVER
    ) {
      throw new BadRequestException(
        `Cannot generate invoice for order in status '${order.status}'. Order must be PACKED.`,
      );
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store ${storeId} not found.`);
    }

    // Filter approved items
    const approvedItems = order.items.filter(
      (i) =>
        i.reviews[0]?.status === 'APPROVED' && i.status !== 'REJECTED' && i.status !== 'REMOVED',
    );

    if (approvedItems.length === 0) {
      throw new UnprocessableEntityException(
        'Cannot generate invoice for order with no approved items.',
      );
    }

    // Calculate line totals and subtotal
    let subtotal = new Prisma.Decimal(0);
    const lineItemData = approvedItems.map((item) => {
      const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        sku: item.medicine.sku,
        strength: item.medicine.strength,
        dosageForm: item.medicine.dosageForm,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
      };
    });

    const deliveryFee = new Prisma.Decimal(order.deliveryFee);
    const discount = new Prisma.Decimal(order.discount);
    const tax = new Prisma.Decimal(0); // Demo tax rate
    const total = subtotal.add(deliveryFee).sub(discount);

    // Format date string for invoice
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Transaction with sequence generation
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Find latest invoice for this store on this date to increment sequence safely
      const datePrefix = `INV-${store.code}-${yyyymmdd}-`;
      const latestInvoice = await tx.invoice.findFirst({
        where: {
          invoiceNumber: { startsWith: datePrefix },
        },
        orderBy: { invoiceNumber: 'desc' },
      });

      let sequence = 1;
      if (latestInvoice) {
        const parts = latestInvoice.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }

      const invoiceNumber = `${datePrefix}${String(sequence).padStart(4, '0')}`;

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          storeId: store.id,
          customerId: order.customerUserId,
          subtotal,
          deliveryFee,
          discount,
          tax,
          total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          issuedByUserId: userId || null,
          issuedAt: now,
          items: {
            create: lineItemData,
          },
        },
        include: { items: true },
      });

      // Transition order to READY_FOR_HANDOVER
      if (order.status === OrderStatus.PACKED) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.READY_FOR_HANDOVER },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: OrderStatus.PACKED,
            newStatus: OrderStatus.READY_FOR_HANDOVER,
            changedByUserId: userId || null,
            note: `Invoice ${invoiceNumber} issued. Ready for courier or customer collection.`,
          },
        });
      }

      return created;
    });

    await this.auditService.record({
      actorUserId: userId || null,
      action: 'INVOICE_ISSUED',
      resourceType: 'Invoice',
      resourceId: invoice.id,
      metadata: {
        orderId: order.id,
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        paymentMethod: invoice.paymentMethod,
      },
    });

    return invoice;
  }

  /**
   * Retrieves an invoice by orderId.
   */
  async getInvoiceByOrderId(orderId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        store: { select: { id: true, code: true, name: true, address: true, city: true } },
        order: { select: { id: true, orderNumber: true, placedAt: true } },
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice for order ${orderId} not found.`);
    }

    const customerUser = await this.prisma.user.findUnique({
      where: { id: invoice.customerId },
      select: {
        id: true,
        email: true,
        phone: true,
        customerProfile: { select: { fullName: true } },
      },
    });

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      orderNumber: invoice.order.orderNumber,
      storeId: invoice.storeId,
      storeName: invoice.store.name,
      storeCode: invoice.store.code,
      storeAddress: invoice.store.address,
      storeCity: invoice.store.city,
      customerId: invoice.customerId,
      customerName: customerUser?.customerProfile?.fullName || 'Customer',
      customerPhone: customerUser?.phone || null,
      customerEmail: customerUser?.email || null,
      subtotal: Number(invoice.subtotal),
      deliveryFee: Number(invoice.deliveryFee),
      discount: Number(invoice.discount),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      paymentMethod: invoice.paymentMethod,
      paymentStatus: invoice.paymentStatus,
      issuedAt: invoice.issuedAt.toISOString(),
      items: invoice.items.map((i) => ({
        id: i.id,
        medicineId: i.medicineId,
        medicineName: i.medicineName,
        sku: i.sku,
        strength: i.strength,
        dosageForm: i.dosageForm,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    };
  }
}
