import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { validatePrescriptionFile } from './prescription-file.validator';
import { UploadPrescriptionDto, ListPrescriptionsQueryDto } from './prescriptions.dto';
import { PrescriptionStatus, Prisma } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
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
      viewUrl,
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
}
