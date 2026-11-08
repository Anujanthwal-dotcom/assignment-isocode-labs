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
  Prisma,
} from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly orderNumberService: OrderNumberService,
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
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: items,
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
          },
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
      return null;
    }

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

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.orderNumberService.generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerUserId,
          familyMemberId: prescription.familyMemberId,
          prescriptionId: prescription.id,
          addressId: dto.addressId,
          fulfilmentStoreId: quote.storeId,
          status: OrderStatus.APPROVED,
          paymentMethod: dto.paymentMethod,
          paymentStatus: initialPaymentStatus,
          subtotal: quote.subtotal,
          deliveryFee: quote.deliveryFee,
          discount: new Prisma.Decimal('0.00'),
          totalAmount: quote.totalAmount,
          addressSnapshot,
          customerNote: dto.customerNote?.trim() || null,
          items: {
            create: availableItems.map((item) => ({
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
              amount: quote.totalAmount,
              provider: 'MOCK',
              transactionReference: `TXN-QUOTE-${Date.now()}`,
            },
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: OrderStatus.APPROVED,
              changedByUserId: customerUserId,
              note: `Order placed from verified quotation ${quote.id}. Payment: ${dto.paymentMethod}`,
            },
          },
        },
      });

      // Update quote to ACCEPTED and link orderId
      await tx.prescriptionQuote.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          orderId: order.id,
        },
      });

      return order;
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'ORDER_PLACED_FROM_PRESCRIPTION_QUOTE',
      resourceType: 'Order',
      resourceId: createdOrder.id,
      metadata: {
        prescriptionId,
        quoteId: quote.id,
        orderNumber: createdOrder.orderNumber,
        totalAmount: Number(createdOrder.totalAmount),
      },
    });

    return createdOrder;
  }
}
