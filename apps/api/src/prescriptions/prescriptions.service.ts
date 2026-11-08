import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { OrderNumberService } from '../orders/order-number.service';
import { validatePrescriptionFile } from './prescription-file.validator';
import {
  UploadPrescriptionDto,
  ListPrescriptionsQueryDto,
  AcceptPrescriptionQuoteAndPayDto,
} from './prescriptions.dto';
import {
  PrescriptionStatus,
  OrderStatus,
  OrderItemStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderRoutingMethod,
  OrderRoutingStatus,
  StockReservationStatus,
  Prisma,
} from '@prisma/client';
import { StoreDistanceService, Coordinates } from '../order-routing/store-distance.service';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly orderNumberService: OrderNumberService,
    private readonly storeDistanceService: StoreDistanceService,
  ) {}

  async uploadPrescription(
    customerUserId: string,
    file: Express.Multer.File,
    dto: UploadPrescriptionDto,
  ) {
    const validated = validatePrescriptionFile(file);

    if (dto.familyMemberId) {
      const member = await this.prisma.familyMember.findFirst({
        where: {
          id: dto.familyMemberId,
          customerUserId,
          isDeleted: false,
        },
      });

      if (!member) {
        throw new BadRequestException({
          code: 'FAMILY_MEMBER_NOT_FOUND',
          message: 'Selected family member not found or does not belong to you.',
        });
      }
    }

    // Upload to MinIO private bucket
    const objectKey = await this.storageService.uploadPrescriptionFile(
      validated.buffer,
      validated.originalFileName,
      validated.mimeType,
    );

    // Save record in database
    const prescription = await this.prisma.prescription.create({
      data: {
        customerUserId,
        familyMemberId: dto.familyMemberId || null,
        objectKey,
        originalFileName: validated.originalFileName,
        mimeType: validated.mimeType,
        fileSizeBytes: validated.sizeBytes,
        status: PrescriptionStatus.UPLOADED,
      },
      select: {
        id: true,
        customerUserId: true,
        familyMemberId: true,
        originalFileName: true,
        mimeType: true,
        fileSizeBytes: true,
        status: true,
        uploadedAt: true,
        familyMember: {
          select: {
            id: true,
            fullName: true,
            relationship: true,
          },
        },
      },
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_UPLOADED',
      resourceType: 'Prescription',
      resourceId: prescription.id,
      metadata: {
        originalFileName: prescription.originalFileName,
        familyMemberId: prescription.familyMemberId,
      },
    });

    return prescription;
  }

  async listPrescriptions(customerUserId: string, query: ListPrescriptionsQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {
      customerUserId,
    };

    if (query.familyMemberId) {
      where.familyMemberId = query.familyMemberId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          customerUserId: true,
          familyMemberId: true,
          originalFileName: true,
          mimeType: true,
          fileSizeBytes: true,
          status: true,
          uploadedAt: true,
          updatedAt: true,
          familyMember: {
            select: {
              id: true,
              fullName: true,
              relationship: true,
            },
          },
          quotes: {
            where: { status: { in: ['QUOTED', 'ACCEPTED'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              totalAmount: true,
              orderId: true,
            },
          },
          orders: {
            take: 1,
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: items.map((p) => {
        const latestQuote = p.quotes?.[0] || null;
        const linkedOrder = p.orders?.[0] || null;
        return {
          id: p.id,
          customerUserId: p.customerUserId,
          familyMemberId: p.familyMemberId,
          originalFileName: p.originalFileName,
          mimeType: p.mimeType,
          fileSizeBytes: p.fileSizeBytes,
          status: p.status,
          uploadedAt: p.uploadedAt,
          updatedAt: p.updatedAt,
          familyMember: p.familyMember,
          quoteStatus: latestQuote?.status || null,
          totalAmount: latestQuote ? Number(latestQuote.totalAmount) : null,
          orderId: latestQuote?.orderId || linkedOrder?.id || null,
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPrescription(customerUserId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: {
        id,
        customerUserId,
      },
      select: {
        id: true,
        customerUserId: true,
        familyMemberId: true,
        originalFileName: true,
        mimeType: true,
        fileSizeBytes: true,
        status: true,
        uploadedAt: true,
        updatedAt: true,
        familyMember: {
          select: {
            id: true,
            fullName: true,
            relationship: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            placedAt: true,
            totalAmount: true,
            fulfilmentStore: {
              select: { id: true, code: true, name: true, city: true },
            },
            items: {
              select: { id: true, medicineNameSnapshot: true, quantity: true, lineTotal: true },
            },
          },
          orderBy: { placedAt: 'asc' },
        },
      },
    });

    if (!rx) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found.',
      });
    }

    return rx;
  }

  async getPrescriptionFileUrl(customerUserId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: {
        id,
        customerUserId,
      },
      select: {
        id: true,
        objectKey: true,
        originalFileName: true,
        mimeType: true,
      },
    });

    if (!rx) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found.',
      });
    }

    const fileExists = await this.storageService.prescriptionFileExists(rx.objectKey);
    if (!fileExists) {
      return {
        prescriptionId: rx.id,
        fileName: rx.originalFileName,
        mimeType: rx.mimeType,
        exists: false,
        viewUrl: null,
        url: null,
        expiresInSeconds: 0,
      };
    }

    // Generate 5-minute pre-signed URL (300 seconds)
    const viewUrl = await this.storageService.getPresignedPrescriptionUrl(rx.objectKey, 300);

    // Record access in AuditLog without logging the signed URL
    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_ACCESSED',
      resourceType: 'Prescription',
      resourceId: rx.id,
      metadata: {
        accessType: 'PRESIGNED_URL',
      },
    });

    return {
      prescriptionId: rx.id,
      fileName: rx.originalFileName,
      mimeType: rx.mimeType,
      exists: true,
      viewUrl,
      url: viewUrl,
      expiresInSeconds: 300,
    };
  }

  async deletePrescription(customerUserId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: {
        id,
        customerUserId,
      },
      select: {
        id: true,
        objectKey: true,
      },
    });

    if (!rx) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found.',
      });
    }

    // Check if associated with an order
    const orderCount = await this.prisma.order.count({
      where: { prescriptionId: id },
    });

    if (orderCount > 0) {
      throw new ConflictException({
        code: 'PRESCRIPTION_LINKED_TO_ORDER',
        message: 'Prescriptions associated with an existing order cannot be deleted.',
      });
    }

    // Delete record and storage object
    await this.prisma.prescription.delete({
      where: { id },
    });

    await this.storageService.deletePrescriptionFile(rx.objectKey);

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_DELETED',
      resourceType: 'Prescription',
      resourceId: id,
    });

    return {
      success: true,
      message: 'Prescription deleted successfully.',
    };
  }

  /**
   * Retrieves active prescription price quotation for customer review.
   */
  async getPrescriptionQuote(customerUserId: string, prescriptionId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, customerUserId },
    });
    if (!rx) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found.',
      });
    }

    const quote = await this.prisma.prescriptionQuote.findFirst({
      where: {
        prescriptionId,
        status: { in: ['QUOTED', 'ACCEPTED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    if (!quote) {
      const fallbackOrders = await this.prisma.order.findMany({
        where: { prescriptionId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          fulfilmentStore: {
            select: { id: true, code: true, name: true, city: true },
          },
          items: {
            select: { id: true, medicineNameSnapshot: true, quantity: true, lineTotal: true },
          },
        },
        orderBy: { placedAt: 'asc' },
      });

      if (fallbackOrders.length > 0) {
        const subtotal = fallbackOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        return {
          id: `order-fallback-${prescriptionId}`,
          prescriptionId,
          pharmacistId: '',
          storeId: fallbackOrders[0]?.fulfilmentStore?.id || null,
          status: 'ACCEPTED',
          subtotal,
          deliveryFee: 0,
          totalAmount: subtotal,
          pharmacistNotes: 'Order fulfilled.',
          quotedAt: new Date().toISOString(),
          validUntil: null,
          orderId: fallbackOrders[0].id,
          orders: fallbackOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            totalAmount: Number(o.totalAmount),
            fulfilmentStore: o.fulfilmentStore,
            items: o.items.map((it) => ({
              ...it,
              lineTotal: Number(it.lineTotal),
            })),
          })),
          items: [],
        };
      }

      return null;
    }

    const prescriptionOrders = await this.prisma.order.findMany({
      where: { prescriptionId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        fulfilmentStore: {
          select: { id: true, code: true, name: true, city: true },
        },
        items: {
          select: { id: true, medicineNameSnapshot: true, quantity: true, lineTotal: true },
        },
      },
      orderBy: { placedAt: 'asc' },
    });

    return {
      id: quote.id,
      prescriptionId: quote.prescriptionId,
      pharmacistId: quote.pharmacistId,
      storeId: quote.storeId,
      status: quote.status,
      subtotal: Number(quote.subtotal),
      deliveryFee: Number(quote.deliveryFee),
      totalAmount: Number(quote.totalAmount),
      pharmacistNotes: quote.pharmacistNotes,
      quotedAt: quote.quotedAt.toISOString(),
      validUntil: quote.validUntil?.toISOString() || null,
      orderId: quote.orderId,
      orders: prescriptionOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        fulfilmentStore: o.fulfilmentStore,
        items: o.items.map((it) => ({
          ...it,
          lineTotal: Number(it.lineTotal),
        })),
      })),
      items: quote.items.map((item) => ({
        id: item.id,
        quoteId: item.quoteId,
        medicineId: item.medicineId,
        detectedMedicineName: item.detectedMedicineName,
        medicineNameSnapshot: item.medicineNameSnapshot,
        strengthSnapshot: item.strengthSnapshot,
        dosageFormSnapshot: item.dosageFormSnapshot,
        dosageInstructions: item.dosageInstructions,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
        isAvailable: item.isAvailable,
        unavailableReason: item.unavailableReason,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Customer accepts quotation, selects address & payment method, and creates order.
   */
  async acceptQuoteAndPay(
    customerUserId: string,
    prescriptionId: string,
    dto: AcceptPrescriptionQuoteAndPayDto,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, customerUserId },
      include: { familyMember: true },
    });

    if (!prescription) {
      throw new NotFoundException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'Prescription not found.',
      });
    }

    const quote = await this.prisma.prescriptionQuote.findFirst({
      where: {
        id: dto.quoteId,
        prescriptionId,
        status: 'QUOTED',
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    if (!quote) {
      throw new BadRequestException({
        code: 'QUOTE_INVALID_OR_EXPIRED',
        message: 'The selected quotation is no longer valid or has already been accepted.',
      });
    }

    // Validate delivery address
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: dto.addressId,
        customerUserId,
        isDeleted: false,
      },
    });

    if (!address) {
      throw new BadRequestException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'The selected delivery address was not found.',
      });
    }

    const addressSnapshot = {
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    };

    const availableItems = quote.items.filter((i) => i.isAvailable);
    if (availableItems.length === 0) {
      throw new BadRequestException({
        code: 'NO_AVAILABLE_ITEMS',
        message: 'All items in this prescription quotation are marked unavailable. An order cannot be placed.',
      });
    }

    const initialPaymentStatus =
      dto.paymentMethod === OrderPaymentMethod.COD
        ? OrderPaymentStatus.NOT_REQUIRED
        : OrderPaymentStatus.SUCCESS;

    // Fallback medicine ID if custom item didn't map
    const defaultMed = await this.prisma.medicine.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, sku: true },
    });

    // Calculate customer coordinates from delivery address
    let customerCoords: Coordinates | null = null;
    if (address.latitude && address.longitude) {
      const lat = Number(address.latitude);
      const lon = Number(address.longitude);
      if (this.storeDistanceService.isValidCoordinates({ latitude: lat, longitude: lon })) {
        customerCoords = { latitude: lat, longitude: lon };
      }
    }

    // Retrieve active stores and rank by geographic distance to customer
    const activeStores = await this.prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, name: true, latitude: true, longitude: true },
    }).catch(() => []);

    const storesWithDistance = activeStores.map((store) => {
      let distanceKm: number | null = null;
      const storeLat = store.latitude ? Number(store.latitude) : null;
      const storeLon = store.longitude ? Number(store.longitude) : null;
      if (
        customerCoords &&
        storeLat !== null &&
        storeLon !== null &&
        this.storeDistanceService.isValidCoordinates({ latitude: storeLat, longitude: storeLon })
      ) {
        distanceKm = this.storeDistanceService.calculateDistanceKm(customerCoords, {
          latitude: storeLat,
          longitude: storeLon,
        });
      }
      return { ...store, distanceKm };
    });

    storesWithDistance.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.code.localeCompare(b.code);
    });

    // Retrieve live inventory balances and active reservations across candidate stores
    const medIds = availableItems
      .map((i) => i.medicineId)
      .filter((id): id is string => Boolean(id));
    const storeIds = storesWithDistance.map((s) => s.id);

    const [balances, reservations] = await Promise.all([
      storeIds.length > 0 && medIds.length > 0
        ? this.prisma.inventoryBalance.findMany({
            where: {
              storeId: { in: storeIds },
              medicineId: { in: medIds },
            },
          }).catch(() => [])
        : Promise.resolve([]),
      storeIds.length > 0 && medIds.length > 0
        ? this.prisma.stockReservation.groupBy({
            by: ['storeId', 'medicineId'],
            where: {
              storeId: { in: storeIds },
              medicineId: { in: medIds },
              status: StockReservationStatus.ACTIVE,
            },
            _sum: { quantity: true },
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const resMap = new Map<string, number>();
    for (const r of reservations) {
      if (r.storeId && r.medicineId) {
        resMap.set(`${r.storeId}_${r.medicineId}`, r._sum.quantity || 0);
      }
    }

    const getStoreItemStock = (storeId: string, medicineId: string | null) => {
      if (!medicineId) return 999;
      const b = (balances as any[]).find((x) => x.storeId === storeId && x.medicineId === medicineId);
      const onHand = b?.quantity || 0;
      const reserved = resMap.get(`${storeId}_${medicineId}`) || 0;
      return Math.max(0, onHand - reserved);
    };

    // Determine store assignments: Priority 1 = single nearest store; Priority 2 = split across nearest stores
    interface StoreAllocation {
      store: (typeof storesWithDistance)[0] | { id: string; code: string; name: string; distanceKm: number | null };
      items: typeof availableItems;
    }

    const allocations: StoreAllocation[] = [];

    if (storesWithDistance.length === 0) {
      allocations.push({
        store: { id: quote.storeId || '00000000-0000-0000-0000-000000000001', code: 'FALLBACK', name: 'Default Store', distanceKm: null },
        items: availableItems,
      });
    } else {
      // Priority 1: Check if any single store has 100% of all items
      const singleStore = storesWithDistance.find((st) => {
        return availableItems.every((item) => {
          const avail = getStoreItemStock(st.id, item.medicineId);
          return avail >= item.quantity;
        });
      });

      if (singleStore) {
        allocations.push({
          store: singleStore,
          items: availableItems,
        });
      } else {
        // Priority 2: Greedy split across nearest stores holding stock
        let remaining = [...availableItems];

        for (const st of storesWithDistance) {
          if (remaining.length === 0) break;
          const fulfillableHere: typeof availableItems = [];
          const stillRemaining: typeof availableItems = [];

          for (const it of remaining) {
            const avail = getStoreItemStock(st.id, it.medicineId);
            if (avail >= it.quantity) {
              fulfillableHere.push(it);
            } else {
              stillRemaining.push(it);
            }
          }

          if (fulfillableHere.length > 0) {
            allocations.push({
              store: st,
              items: fulfillableHere,
            });
            remaining = stillRemaining;
          }
        }

        // Assign any remaining unallocated items to nearest store
        if (remaining.length > 0) {
          const targetStore = allocations[0]?.store || storesWithDistance[0];
          const existingAlloc = allocations.find((a) => a.store.id === targetStore.id);
          if (existingAlloc) {
            existingAlloc.items.push(...remaining);
          } else {
            allocations.push({
              store: targetStore,
              items: remaining,
            });
          }
        }
      }
    }

    const bundleTxnRef = `TXN-BUNDLE-${Date.now()}`;
    const isSplit = allocations.length > 1;

    const createdOrders = await this.prisma.$transaction(async (tx) => {
      const orders: any[] = [];

      for (let idx = 0; idx < allocations.length; idx++) {
        const alloc = allocations[idx];
        const orderNumber = await this.orderNumberService.generateOrderNumber(tx);

        const subtotal = alloc.items.reduce(
          (acc, item) => acc.add(new Prisma.Decimal(item.lineTotal.toString())),
          new Prisma.Decimal('0.00'),
        );

        // Bundle payment: Only the first order absorbs the delivery fee, split subsequent orders have deliveryFee = 0.00
        const deliveryFee = idx === 0 ? quote.deliveryFee : new Prisma.Decimal('0.00');
        const totalAmount = subtotal.add(deliveryFee);

        const order = await tx.order.create({
          data: {
            orderNumber,
            customerUserId,
            familyMemberId: prescription.familyMemberId,
            prescriptionId: prescription.id,
            addressId: dto.addressId,
            fulfilmentStoreId: alloc.store.id,
            status: OrderStatus.APPROVED,
            paymentMethod: dto.paymentMethod,
            paymentStatus: initialPaymentStatus,
            subtotal,
            deliveryFee,
            discount: new Prisma.Decimal('0.00'),
            totalAmount,
            addressSnapshot,
            customerNote: dto.customerNote?.trim() || null,
            items: {
              create: alloc.items.map((item) => ({
                medicineId: item.medicineId || defaultMed?.id || '00000000-0000-0000-0000-000000000000',
                medicineNameSnapshot: item.medicineNameSnapshot,
                skuSnapshot: item.medicine?.sku || defaultMed?.sku || 'SKU-RX-CUSTOM',
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                lineTotal: item.lineTotal,
                status: OrderItemStatus.APPROVED,
              })),
            },
            payment: {
              create: {
                method: dto.paymentMethod,
                status: initialPaymentStatus,
                amount: totalAmount,
                provider: 'MOCK',
                transactionReference: isSplit ? `${bundleTxnRef}-S${idx + 1}` : bundleTxnRef,
              },
            },
            statusHistory: {
              create: {
                previousStatus: null,
                newStatus: OrderStatus.APPROVED,
                changedByUserId: customerUserId,
                note: isSplit
                  ? `Split order ${idx + 1} of ${allocations.length} auto-assigned to ${alloc.store.name} (${alloc.store.code}). Bundle Ref: ${bundleTxnRef}`
                  : `Order placed from verified quotation. Auto-assigned to nearest store ${alloc.store.name} (${alloc.store.code}).`,
              },
            },
            routingDecisions: {
              create: {
                storeId: alloc.store.id,
                routingMethod: OrderRoutingMethod.AUTOMATIC,
                status: OrderRoutingStatus.SUCCESS,
                distanceKm: alloc.store.distanceKm !== null ? new Prisma.Decimal(alloc.store.distanceKm.toFixed(2)) : null,
                candidateStoreIds: storesWithDistance.map((s) => s.id),
              },
            },
          },
          include: {
            items: true,
            fulfilmentStore: true,
          },
        });

        // Create stock reservations for this order's items
        if (Array.isArray(order.items)) {
          for (const orderItem of order.items) {
            await tx.stockReservation.create({
              data: {
                orderId: order.id,
                orderItemId: orderItem.id,
                storeId: alloc.store.id,
                medicineId: orderItem.medicineId,
                quantity: orderItem.quantity,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                status: StockReservationStatus.ACTIVE,
              },
            }).catch(() => null);
          }
        }

        orders.push(order);
      }

      // Update quote to ACCEPTED and link orderId to primary order
      await tx.prescriptionQuote.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          orderId: orders[0].id,
        },
      });

      return orders;
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'ORDER_PLACED_FROM_PRESCRIPTION_QUOTE',
      resourceType: 'Order',
      resourceId: createdOrders[0].id,
      metadata: {
        prescriptionId,
        quoteId: quote.id,
        orderCount: createdOrders.length,
        orderNumbers: createdOrders.map((o) => o.orderNumber),
        totalAmount: Number(quote.totalAmount),
        isSplit,
      },
    });

    return {
      ...createdOrders[0],
      splitOrders: createdOrders,
      isSplit,
    };
  }
}
