import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceEvaluatorService } from '../compliance/compliance-evaluator.service';
import {
  OrderStatus,
  PrescriptionStatus,
  PrescriptionReviewStatus,
  OrderItemReviewStatus,
  OrderItemStatus,
  AlternativeProposalStatus,
  H1RegisterStatus,
  MedicineSchedule,
  Prisma,
} from '@prisma/client';
import {
  UpdateOrderItemReviewDto,
  ApproveOrderItemDto,
  RejectOrderItemDto,
  BlockOrderItemDto,
  ProposeAlternativeDto,
  RejectPrescriptionDto,
  RequestReuploadDto,
  PharmacistQueueQueryDto,
  CreatePrescriptionQuoteDto,
} from './pharmacist-verification.dto';

@Injectable()
export class PharmacistVerificationService {
  private readonly logger = new Logger(PharmacistVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly complianceEvaluator: ComplianceEvaluatorService,
  ) {}

  /**
   * Helper to resolve the authenticated pharmacist's physical store assignment.
   */
  async getPharmacistStore(userId: string) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
      include: { store: true },
    });

    if (!profile || !profile.storeId) {
      throw new ForbiddenException(
        'Pharmacist profile or store assignment not found for authenticated user.',
      );
    }

    return profile.store;
  }

  /**
   * Returns verification queue strictly scoped to the pharmacist's assigned store.
   */
  async getQueue(userId: string, query?: PharmacistQueueQueryDto) {
    const store = await this.getPharmacistStore(userId);
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      reviewAssignments: {
        some: {
          storeId: store.id,
          unassignedAt: null,
        },
      },
    };

    if (query?.status) {
      where.prescriptionReviews = {
        some: {
          status: query.status,
          storeId: store.id,
        },
      };
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        {
          customerUser: { customerProfile: { fullName: { contains: term, mode: 'insensitive' } } },
        },
        { items: { some: { medicineNameSnapshot: { contains: term, mode: 'insensitive' } } } },
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
          customerUser: { include: { customerProfile: true } },
          familyMember: true,
          prescription: true,
          items: { include: { medicine: true } },
          prescriptionReviews: {
            where: { storeId: store.id },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      store: {
        id: store.id,
        code: store.code,
        name: store.name,
      },
      data: orders.map((o) => {
        const latestReview = o.prescriptionReviews[0];
        return {
          orderId: o.id,
          orderNumber: o.orderNumber,
          customerName:
            o.familyMember?.fullName || o.customerUser.customerProfile?.fullName || 'Customer',
          placedAt: o.placedAt,
          orderStatus: o.status,
          prescriptionId: o.prescriptionId,
          prescriptionStatus: o.prescription.status,
          reviewStatus: latestReview?.status || PrescriptionReviewStatus.PENDING,
          itemCount: o.items.length,
          medicineNames: o.items.map((i) => i.medicineNameSnapshot),
          assignedStoreId: store.id,
          assignedStoreName: store.name,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves side-by-side verification review screen details:
   * - Original prescription signed URL
   * - AI extraction draft
   * - Items with compliance evaluations & review states
   */
  async getReviewDetail(orderId: string, userId: string) {
    const store = await this.getPharmacistStore(userId);

    // Verify manual store assignment
    const activeAssignment = await this.prisma.orderReviewAssignment.findFirst({
      where: { orderId, unassignedAt: null },
      include: { store: true },
    });

    if (!activeAssignment) {
      throw new ForbiddenException(
        'This order is not assigned to any store for pharmacist review.',
      );
    }

    if (activeAssignment.storeId !== store.id) {
      throw new ForbiddenException(
        `Access denied: this order is assigned to store ${activeAssignment.store.code}, not your store (${store.code}).`,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customerUser: {
          select: {
            id: true,
            email: true,
            phone: true,
            customerProfile: true,
          },
        },
        familyMember: true,
        prescription: {
          include: {
            aiExtractions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            medicine: true,
            reviews: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            alternativeProposals: {
              where: { status: AlternativeProposalStatus.PENDING },
              include: { originalMedicine: true, proposedMedicine: true },
              take: 1,
            },
          },
        },
        prescriptionReviews: {
          where: { storeId: store.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found.`);
    }

    // Generate short-lived signed URL (300 seconds expiry)
    let viewUrl = '';
    try {
      viewUrl = await this.storageService.getPresignedPrescriptionUrl(
        order.prescription.objectKey,
        300,
      );
    } catch (err: any) {
      this.logger.warn(`Could not generate presigned URL for prescription: ${err.message}`);
    }

    // Ensure review records exist transactionally if opening review for first time
    let reviewRecord = order.prescriptionReviews[0];
    if (!reviewRecord) {
      reviewRecord = await this.prisma.$transaction(async (tx) => {
        const rev = await tx.prescriptionReview.create({
          data: {
            orderId: order.id,
            prescriptionId: order.prescription.id,
            pharmacistId: userId,
            storeId: store.id,
            status: PrescriptionReviewStatus.IN_REVIEW,
          },
        });

        // Initialize item reviews
        for (const item of order.items) {
          await tx.orderItemReview.create({
            data: {
              orderItemId: item.id,
              prescriptionReviewId: rev.id,
              pharmacistId: userId,
              medicineId: item.medicineId,
              status: OrderItemReviewStatus.PENDING,
              reviewedMedicineName: item.medicineNameSnapshot,
              reviewedQuantity: item.quantity,
              reviewedDosageForm: item.medicine.dosageForm,
              reviewedStrength: item.medicine.strength,
            },
          });
        }

        // If order was in PENDING_VERIFICATION, transition to UNDER_REVIEW
        if (order.status === OrderStatus.PENDING_VERIFICATION) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.UNDER_REVIEW },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              previousStatus: OrderStatus.PENDING_VERIFICATION,
              newStatus: OrderStatus.UNDER_REVIEW,
              changedByUserId: userId,
              note: 'Pharmacist started prescription verification review',
            },
          });
        }

        return rev;
      });
    }

    // Log document access audit event
    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_DOCUMENT_VIEWED',
      resourceType: 'Prescription',
      resourceId: order.prescription.id,
      metadata: {
        orderId: order.id,
        storeId: store.id,
      },
    });

    const latestAi = order.prescription.aiExtractions[0] || null;

    // Evaluate compliance for all items
    const evaluatedItems = await Promise.all(
      order.items.map(async (item, idx) => {
        const itemReview = item.reviews[0] || null;
        const medicineToEvaluate = itemReview?.medicineId
          ? await this.prisma.medicine.findUnique({ where: { id: itemReview.medicineId } })
          : item.medicine;

        const complianceEvaluation = await this.complianceEvaluator.evaluate({
          medicineId: medicineToEvaluate?.id || item.medicineId,
          schedule: medicineToEvaluate?.schedule || item.medicine.schedule,
          hasPrescription: !!order.prescriptionId,
          hasH1RegisterDetails: false, // will be provided upon explicit approval
        });

        // Extract draft candidate if available from AI
        const extractedDraft =
          latestAi?.extractionResult && Array.isArray((latestAi.extractionResult as any).items)
            ? (latestAi.extractionResult as any).items[idx]
            : null;

        const matchingResult =
          latestAi?.matchingResult && Array.isArray(latestAi.matchingResult as any)
            ? (latestAi.matchingResult as any).find((m: any) => m.extractedItemIndex === idx)
            : null;

        return {
          orderItemId: item.id,
          medicineId: item.medicineId,
          medicineName: item.medicineNameSnapshot,
          brandName: item.medicine.brandName,
          genericName: item.medicine.genericName,
          sku: item.skuSnapshot,
          schedule: item.medicine.schedule,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          lineTotal: Number(item.lineTotal),
          orderItemStatus: item.status,
          review: itemReview
            ? {
                ...itemReview,
                medicineSku: item.medicine.sku,
                medicineName: item.medicine.name,
                medicineSchedule: item.medicine.schedule,
              }
            : null,
          activeAlternativeProposal: item.alternativeProposals[0] || null,
          complianceEvaluation,
          extractedDraft,
          matchingResult,
        };
      }),
    );

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        status: order.status,
        customerNote: order.customerNote,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        discount: Number(order.discount),
        totalAmount: Number(order.totalAmount),
        customerUser: {
          id: order.customerUser.id,
          fullName:
            order.familyMember?.fullName ||
            order.customerUser.customerProfile?.fullName ||
            'Customer',
          phone: order.customerUser.phone,
          email: order.customerUser.email,
        },
        familyMember: order.familyMember
          ? {
              id: order.familyMember.id,
              fullName: order.familyMember.fullName,
              relationship: order.familyMember.relationship,
            }
          : null,
      },
      prescription: {
        id: order.prescription.id,
        originalFileName: order.prescription.originalFileName,
        mimeType: order.prescription.mimeType,
        uploadedAt: order.prescription.uploadedAt,
        status: order.prescription.status,
        viewUrl,
      },
      aiExtraction: latestAi
        ? {
            id: latestAi.id,
            status: latestAi.status,
            provider: latestAi.provider,
            model: latestAi.model,
            overallConfidence: latestAi.overallConfidence
              ? Number(latestAi.overallConfidence)
              : null,
            documentReadable: latestAi.documentReadable,
            extractionResult: latestAi.extractionResult,
            matchingResult: latestAi.matchingResult,
          }
        : null,
      items: evaluatedItems,
      review: reviewRecord,
    };
  }

  /**
   * Corrects extracted fields or changes catalogue medicine selection.
   */
  async updateItemReview(
    reviewId: string,
    orderItemId: string,
    dto: UpdateOrderItemReviewDto,
    userId: string,
  ) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const itemReview = await this.prisma.orderItemReview.findFirst({
      where: { prescriptionReviewId: review.id, orderItemId },
    });

    if (!itemReview) {
      throw new NotFoundException('Item review record not found.');
    }

    // If changing medicine match, verify existence
    if (dto.medicineId && dto.medicineId !== itemReview.medicineId) {
      const med = await this.prisma.medicine.findUnique({
        where: { id: dto.medicineId },
      });
      if (!med) {
        throw new NotFoundException(`Catalogue medicine '${dto.medicineId}' not found.`);
      }
    }

    const updated = await this.prisma.orderItemReview.update({
      where: { id: itemReview.id },
      data: {
        medicineId: dto.medicineId ?? itemReview.medicineId,
        reviewedMedicineName: dto.reviewedMedicineName ?? itemReview.reviewedMedicineName,
        reviewedStrength: dto.reviewedStrength ?? itemReview.reviewedStrength,
        reviewedDosageForm: dto.reviewedDosageForm ?? itemReview.reviewedDosageForm,
        reviewedDosageInstructions:
          dto.reviewedDosageInstructions ?? itemReview.reviewedDosageInstructions,
        reviewedFrequency: dto.reviewedFrequency ?? itemReview.reviewedFrequency,
        reviewedDuration: dto.reviewedDuration ?? itemReview.reviewedDuration,
        reviewedQuantity: dto.reviewedQuantity ?? itemReview.reviewedQuantity,
        unitsPerAdministration:
          dto.unitsPerAdministration !== undefined
            ? new Prisma.Decimal(dto.unitsPerAdministration)
            : itemReview.unitsPerAdministration,
        administrationsPerDay:
          dto.administrationsPerDay !== undefined
            ? new Prisma.Decimal(dto.administrationsPerDay)
            : itemReview.administrationsPerDay,
        verifiedDosageUnit: dto.verifiedDosageUnit ?? itemReview.verifiedDosageUnit,
        verifiedDosageConfirmed:
          dto.unitsPerAdministration !== undefined && dto.administrationsPerDay !== undefined
            ? true
            : itemReview.verifiedDosageConfirmed,
        decisionReason: dto.decisionReason ?? itemReview.decisionReason,
      },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'ORDER_ITEM_REVIEW_FIELDS_CORRECTED',
      resourceType: 'OrderItemReview',
      resourceId: updated.id,
      metadata: {
        orderItemId,
        prescriptionReviewId: review.id,
        changedFields: Object.keys(dto),
      },
    });

    return updated;
  }

  /**
   * Approves an individual medicine item after deterministic compliance check.
   */
  async approveItem(
    reviewId: string,
    orderItemId: string,
    dto: ApproveOrderItemDto,
    userId: string,
  ) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        medicine: true,
        order: { include: { prescription: true } },
      },
    });

    if (!item || item.orderId !== review.orderId) {
      throw new NotFoundException('Order item not found for this review.');
    }

    const itemReview = await this.prisma.orderItemReview.findFirst({
      where: { prescriptionReviewId: review.id, orderItemId },
    });

    if (!itemReview) {
      throw new NotFoundException('Item review record not found.');
    }

    // Resolve target medicine
    const targetMedicine = itemReview.medicineId
      ? await this.prisma.medicine.findUnique({ where: { id: itemReview.medicineId } })
      : item.medicine;

    if (!targetMedicine) {
      throw new NotFoundException('Medicine not found in catalogue.');
    }

    const hasH1Details = !!(dto.patientName?.trim() && dto.prescriberName?.trim());

    // Deterministic compliance evaluation
    const evaluation = await this.complianceEvaluator.evaluate({
      medicineId: targetMedicine.id,
      schedule: targetMedicine.schedule,
      hasPrescription: !!item.order.prescriptionId,
      hasH1RegisterDetails: hasH1Details,
    });

    // Enforce hard compliance blocks: Schedule X and Narcotic are NEVER approvable
    if (evaluation.decision === 'BLOCKED') {
      throw new UnprocessableEntityException(
        `Cannot approve medicine '${targetMedicine.name}': ${evaluation.reasons.join(' ')}`,
      );
    }

    // Enforce fail-closed on UNKNOWN
    if (evaluation.decision === 'UNKNOWN_CLASSIFICATION') {
      throw new UnprocessableEntityException(
        `Cannot approve medicine '${targetMedicine.name}': Medicine classification requires compliance review before approval.`,
      );
    }

    // Enforce prescription requirement
    if (evaluation.decision === 'REQUIRES_PRESCRIPTION') {
      throw new BadRequestException(
        `Cannot approve medicine '${targetMedicine.name}': Valid prescription required.`,
      );
    }

    // Enforce H1 register requirements
    if (evaluation.decision === 'REQUIRES_H1_REGISTER') {
      throw new BadRequestException(
        `Cannot approve Schedule H1 medicine '${targetMedicine.name}': Patient name and prescriber name are required for H1 register recording.`,
      );
    }

    const now = new Date();

    const approvedItemReview = await this.prisma.$transaction(async (tx) => {
      // 1. If Schedule H1, create H1 register entry
      if (targetMedicine.schedule === MedicineSchedule.SCHEDULE_H1) {
        await tx.h1RegisterEntry.create({
          data: {
            orderItemId: item.id,
            orderItemReviewId: itemReview.id,
            prescriptionId: item.order.prescriptionId,
            storeId: store.id,
            patientName: dto.patientName!.trim(),
            prescriberName: dto.prescriberName!.trim(),
            prescriberDetails: dto.prescriberDetails?.trim() || null,
            medicineName: itemReview.reviewedMedicineName || targetMedicine.name,
            quantity: itemReview.reviewedQuantity || item.quantity,
            pharmacistId: userId,
            status: H1RegisterStatus.PENDING_FULFILLMENT,
          },
        });
      }

      // 2. Update OrderItemReview
      const updatedReview = await tx.orderItemReview.update({
        where: { id: itemReview.id },
        data: {
          status: OrderItemReviewStatus.APPROVED,
          complianceEvaluation: evaluation as any,
          complianceRuleSetId: evaluation.ruleVersionId,
          reviewedAt: now,
        },
      });

      // 3. Update OrderItem
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: OrderItemStatus.APPROVED },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'ORDER_ITEM_APPROVED',
      resourceType: 'OrderItemReview',
      resourceId: approvedItemReview.id,
      metadata: {
        orderId: review.orderId,
        orderItemId: item.id,
        medicineName: targetMedicine.name,
        schedule: targetMedicine.schedule,
        ruleVersionId: evaluation.ruleVersionId,
      },
    });

    return approvedItemReview;
  }

  /**
   * Rejects an individual medicine item with mandatory reason.
   */
  async rejectItem(reviewId: string, orderItemId: string, dto: RejectOrderItemDto, userId: string) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const itemReview = await this.prisma.orderItemReview.findFirst({
      where: { prescriptionReviewId: review.id, orderItemId },
    });

    if (!itemReview) {
      throw new NotFoundException('Item review record not found.');
    }

    const now = new Date();

    const rejected = await this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.orderItemReview.update({
        where: { id: itemReview.id },
        data: {
          status: OrderItemReviewStatus.REJECTED,
          decisionReason: dto.reason,
          reviewedAt: now,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderItemStatus.REJECTED },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'ORDER_ITEM_REJECTED',
      resourceType: 'OrderItemReview',
      resourceId: rejected.id,
      metadata: {
        orderId: review.orderId,
        orderItemId,
        reason: dto.reason,
      },
    });

    return rejected;
  }

  /**
   * Marks an individual medicine item as BLOCKED due to compliance policy.
   */
  async blockItem(reviewId: string, orderItemId: string, dto: BlockOrderItemDto, userId: string) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const itemReview = await this.prisma.orderItemReview.findFirst({
      where: { prescriptionReviewId: review.id, orderItemId },
    });

    if (!itemReview) {
      throw new NotFoundException('Item review record not found.');
    }

    const now = new Date();

    const blocked = await this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.orderItemReview.update({
        where: { id: itemReview.id },
        data: {
          status: OrderItemReviewStatus.BLOCKED,
          decisionReason: dto.reason,
          reviewedAt: now,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderItemStatus.REJECTED },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'ORDER_ITEM_BLOCKED',
      resourceType: 'OrderItemReview',
      resourceId: blocked.id,
      metadata: {
        orderId: review.orderId,
        orderItemId,
        reason: dto.reason,
      },
    });

    return blocked;
  }

  /**
   * Proposes an eligible generic alternative requiring customer consent.
   */
  async proposeAlternative(
    reviewId: string,
    orderItemId: string,
    dto: ProposeAlternativeDto,
    userId: string,
  ) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { medicine: true },
    });

    if (!item || item.orderId !== review.orderId) {
      throw new NotFoundException('Order item not found for this review.');
    }

    const proposedMed = await this.prisma.medicine.findUnique({
      where: { id: dto.proposedMedicineId },
    });

    if (!proposedMed) {
      throw new NotFoundException('Proposed catalogue medicine not found.');
    }

    // Invariant: cannot propose substitution for hard blocked medicines
    if (
      item.medicine.schedule === MedicineSchedule.SCHEDULE_X ||
      item.medicine.schedule === MedicineSchedule.NARCOTIC
    ) {
      throw new BadRequestException('Cannot propose alternative for a hard-blocked medicine.');
    }

    // Minimum equivalence condition: active ingredient (genericName)
    if (
      !item.medicine.genericName ||
      !proposedMed.genericName ||
      item.medicine.genericName.toLowerCase().trim() !==
        proposedMed.genericName.toLowerCase().trim()
    ) {
      throw new BadRequestException(
        `Generic alternative must have the exact same active ingredient. Prescribed: '${item.medicine.genericName}', Proposed: '${proposedMed.genericName}'.`,
      );
    }

    const originalMrp = Number(item.medicine.mrp);
    const proposedMrp = Number(proposedMed.mrp);
    const priceDifference = proposedMrp - originalMrp;

    const itemReview = await this.prisma.orderItemReview.findFirst({
      where: { prescriptionReviewId: review.id, orderItemId },
    });

    const proposal = await this.prisma.$transaction(async (tx) => {
      // 1. Create proposal record
      const created = await tx.orderItemAlternativeProposal.create({
        data: {
          orderItemId: item.id,
          orderItemReviewId: itemReview?.id || null,
          prescriptionReviewId: review.id,
          proposedByPharmacistId: userId,
          originalMedicineId: item.medicineId,
          proposedMedicineId: proposedMed.id,
          activeIngredient: proposedMed.genericName!,
          strength: proposedMed.strength || 'Standard',
          dosageForm: proposedMed.dosageForm || 'Standard',
          packSize: proposedMed.packSize || null,
          priceDifference,
          reason: dto.reason,
          status: AlternativeProposalStatus.PENDING,
        },
        include: {
          originalMedicine: true,
          proposedMedicine: true,
        },
      });

      // 2. Update item review status
      if (itemReview) {
        await tx.orderItemReview.update({
          where: { id: itemReview.id },
          data: { status: OrderItemReviewStatus.ALTERNATIVE_PENDING_CUSTOMER },
        });
      }

      // 3. Move order to AWAITING_CUSTOMER_ACTION
      await tx.order.update({
        where: { id: review.orderId },
        data: { status: OrderStatus.AWAITING_CUSTOMER_ACTION },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: review.orderId,
          previousStatus: OrderStatus.UNDER_REVIEW,
          newStatus: OrderStatus.AWAITING_CUSTOMER_ACTION,
          changedByUserId: userId,
          note: `Generic alternative proposed by pharmacist: ${proposedMed.name}`,
        },
      });

      return created;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'GENERIC_ALTERNATIVE_PROPOSED',
      resourceType: 'OrderItemAlternativeProposal',
      resourceId: proposal.id,
      metadata: {
        orderId: review.orderId,
        orderItemId,
        originalMedicine: item.medicine.name,
        proposedMedicine: proposedMed.name,
        reason: dto.reason,
      },
    });

    return proposal;
  }

  /**
   * Completes prescription review.
   * Ensures every item has a decision before approving.
   */
  async approvePrescription(reviewId: string, userId: string) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const order = await this.prisma.order.findUnique({
      where: { id: review.orderId },
      include: {
        items: {
          include: {
            reviews: {
              where: { prescriptionReviewId: review.id },
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    // Check that ALL items have a decision
    const pendingItems = order.items.filter((item) => {
      const r = item.reviews[0];
      return (
        !r ||
        r.status === OrderItemReviewStatus.PENDING ||
        r.status === OrderItemReviewStatus.ALTERNATIVE_PENDING_CUSTOMER
      );
    });

    if (pendingItems.length > 0) {
      throw new BadRequestException(
        `Cannot approve prescription: ${pendingItems.length} medicine item(s) are still pending pharmacist decision or customer response.`,
      );
    }

    // Determine final status
    const approvedItems = order.items.filter(
      (item) => item.reviews[0]?.status === OrderItemReviewStatus.APPROVED,
    );
    const nonApprovedItems = order.items.filter(
      (item) => item.reviews[0]?.status !== OrderItemReviewStatus.APPROVED,
    );

    if (approvedItems.length === 0) {
      throw new BadRequestException(
        'Cannot approve prescription when zero items have been approved.',
      );
    }

    const isPartial = nonApprovedItems.length > 0;
    const finalOrderStatus = isPartial ? OrderStatus.PARTIALLY_APPROVED : OrderStatus.APPROVED;

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update PrescriptionReview
      const updatedReview = await tx.prescriptionReview.update({
        where: { id: review.id },
        data: {
          status: PrescriptionReviewStatus.APPROVED,
          reviewedAt: now,
        },
      });

      // 2. Update Prescription
      await tx.prescription.update({
        where: { id: review.prescriptionId },
        data: { status: PrescriptionStatus.APPROVED },
      });

      // 3. Update Order
      await tx.order.update({
        where: { id: order.id },
        data: { status: finalOrderStatus },
      });

      // 4. Record order history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: finalOrderStatus,
          changedByUserId: userId,
          note: isPartial
            ? 'Order partially approved by pharmacist. Blocked/rejected items require customer removal.'
            : 'All prescription items verified and approved by registered pharmacist.',
        },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: isPartial ? 'PRESCRIPTION_PARTIALLY_APPROVED' : 'PRESCRIPTION_APPROVED',
      resourceType: 'PrescriptionReview',
      resourceId: result.id,
      metadata: {
        orderId: order.id,
        approvedCount: approvedItems.length,
        rejectedOrBlockedCount: nonApprovedItems.length,
      },
    });

    return result;
  }

  /**
   * Rejects entire prescription with mandatory reason.
   */
  async rejectPrescription(reviewId: string, dto: RejectPrescriptionDto, userId: string) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.prescriptionReview.update({
        where: { id: review.id },
        data: {
          status: PrescriptionReviewStatus.REJECTED,
          reviewNotes: dto.reason,
          reviewedAt: now,
        },
      });

      await tx.prescription.update({
        where: { id: review.prescriptionId },
        data: { status: PrescriptionStatus.REJECTED },
      });

      await tx.order.update({
        where: { id: review.orderId },
        data: { status: OrderStatus.REJECTED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: review.orderId,
          previousStatus: OrderStatus.UNDER_REVIEW,
          newStatus: OrderStatus.REJECTED,
          changedByUserId: userId,
          note: `Prescription rejected by pharmacist: ${dto.reason}`,
        },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_REJECTED',
      resourceType: 'PrescriptionReview',
      resourceId: result.id,
      metadata: {
        orderId: review.orderId,
        reason: dto.reason,
      },
    });

    return result;
  }

  /**
   * Requests prescription re-upload from customer with mandatory reason.
   */
  async requestReupload(reviewId: string, dto: RequestReuploadDto, userId: string) {
    const store = await this.getPharmacistStore(userId);
    const review = await this.verifyReviewAccess(reviewId, store.id);

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.prescriptionReview.update({
        where: { id: review.id },
        data: {
          status: PrescriptionReviewStatus.REUPLOAD_REQUESTED,
          reviewNotes: dto.reason,
          reviewedAt: now,
        },
      });

      await tx.prescription.update({
        where: { id: review.prescriptionId },
        data: { status: PrescriptionStatus.REUPLOAD_REQUIRED },
      });

      await tx.order.update({
        where: { id: review.orderId },
        data: { status: OrderStatus.AWAITING_CUSTOMER_ACTION },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: review.orderId,
          previousStatus: OrderStatus.UNDER_REVIEW,
          newStatus: OrderStatus.AWAITING_CUSTOMER_ACTION,
          changedByUserId: userId,
          note: `Prescription re-upload requested by pharmacist: ${dto.reason}`,
        },
      });

      return updatedReview;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_REUPLOAD_REQUESTED',
      resourceType: 'PrescriptionReview',
      resourceId: result.id,
      metadata: {
        orderId: review.orderId,
        reason: dto.reason,
      },
    });

    return result;
  }

  private async verifyReviewAccess(reviewId: string, pharmacistStoreId: string) {
    const review = await this.prisma.prescriptionReview.findUnique({
      where: { id: reviewId },
      include: {
        order: {
          include: {
            reviewAssignments: { where: { unassignedAt: null } },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Prescription review with ID '${reviewId}' not found.`);
    }

    if (review.storeId !== pharmacistStoreId) {
      throw new ForbiddenException(
        'Access denied: You cannot perform review actions on an order assigned to another store.',
      );
    }

    return review;
  }

  /**
   * Retrieves all prescriptions awaiting pharmacist verification and quotation.
   */
  async getPrescriptionQueue(userId: string) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
      include: { store: true },
    });
    const store = profile?.store || (await this.prisma.store.findFirst({ where: { status: 'ACTIVE' } }));

    const dummyFiles = [
      'test-rx.jpg',
      'doctor-prescription.png',
      'rx.png',
      'e2e-refill-test.pdf',
      'rx-b.jpg',
      'blurry-rx.jpg',
      'replacement-rx.jpg',
      'rx-conc.png',
      'rx-pay.png',
      'rx-ho.png',
    ];

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        status: { in: [PrescriptionStatus.UPLOADED, PrescriptionStatus.UNDER_REVIEW, PrescriptionStatus.APPROVED] },
        originalFileName: { notIn: dummyFiles },
      },
      orderBy: { uploadedAt: 'desc' },
      include: {
        customerUser: {
          select: {
            id: true,
            customerProfile: true,
          },
        },
        familyMember: true,
        aiExtractions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      store: store
        ? {
            id: store.id,
            code: store.code,
            name: store.name,
          }
        : {
            id: 'central',
            code: 'CENTRAL',
            name: 'Central Platform Queue',
          },
      data: prescriptions.map((p) => {
        const latestExtraction = p.aiExtractions[0];
        const latestQuote = p.quotes[0];
        const extractionItems = (latestExtraction?.extractionResult as any)?.items || [];

        return {
          id: p.id,
          originalFileName: p.originalFileName,
          mimeType: p.mimeType,
          fileSizeBytes: p.fileSizeBytes,
          status: p.status,
          uploadedAt: p.uploadedAt,
          customerUserId: p.customerUserId,
          customerName: p.customerUser.customerProfile?.fullName || 'Customer',
          patientName: p.familyMember?.fullName || p.customerUser.customerProfile?.fullName || 'Self',
          relationship: p.familyMember?.relationship || 'SELF',
          aiStatus: latestExtraction?.status || 'NOT_STARTED',
          detectedCount: extractionItems.length,
          quoteStatus: latestQuote?.status || null,
        };
      }),
    };
  }

  /**
   * Side-by-side prescription verification workspace details:
   * Document scan URL, customer info, latest AI extraction with catalogue comparisons, existing quote.
   */
  async getPrescriptionVerificationDetail(prescriptionId: string, userId: string) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new ForbiddenException('Pharmacist profile not found for authenticated user.');
    }

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        customerUser: {
          select: {
            id: true,
            email: true,
            phone: true,
            customerProfile: true,
          },
        },
        familyMember: true,
        aiExtractions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            items: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription '${prescriptionId}' not found.`);
    }

    // Auto-update status to UNDER_REVIEW if newly opened
    if (prescription.status === PrescriptionStatus.UPLOADED) {
      await this.prisma.prescription.update({
        where: { id: prescriptionId },
        data: { status: PrescriptionStatus.UNDER_REVIEW },
      });
      prescription.status = PrescriptionStatus.UNDER_REVIEW;
    }

    // Generate signed document view URL (10 minutes)
    let viewUrl: string | null = null;
    try {
      viewUrl = await this.storageService.getPresignedPrescriptionUrl(prescription.objectKey, 600);
    } catch (err: any) {
      this.logger.warn(`Could not generate presigned preview URL for prescription: ${err.message}`);
    }

    const latestQuote = prescription.quotes[0];
    const formattedQuote = latestQuote
      ? {
          id: latestQuote.id,
          prescriptionId: latestQuote.prescriptionId,
          pharmacistId: latestQuote.pharmacistId,
          storeId: latestQuote.storeId,
          status: latestQuote.status,
          subtotal: Number(latestQuote.subtotal),
          deliveryFee: Number(latestQuote.deliveryFee),
          totalAmount: Number(latestQuote.totalAmount),
          pharmacistNotes: latestQuote.pharmacistNotes,
          quotedAt: latestQuote.quotedAt.toISOString(),
          validUntil: latestQuote.validUntil?.toISOString() || null,
          orderId: latestQuote.orderId,
          items: latestQuote.items.map((item) => ({
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
        }
      : null;

    return {
      prescription: {
        id: prescription.id,
        originalFileName: prescription.originalFileName,
        mimeType: prescription.mimeType,
        fileSizeBytes: prescription.fileSizeBytes,
        status: prescription.status,
        uploadedAt: prescription.uploadedAt.toISOString(),
        viewUrl,
      },
      customer: {
        id: prescription.customerUser.id,
        fullName: prescription.customerUser.customerProfile?.fullName || 'Customer',
        phone: prescription.customerUser.phone,
        email: prescription.customerUser.email,
      },
      patient: {
        name: prescription.familyMember?.fullName || prescription.customerUser.customerProfile?.fullName || 'Self',
        relationship: prescription.familyMember?.relationship || 'SELF',
        dateOfBirth: prescription.familyMember?.dateOfBirth?.toISOString() || null,
      },
      aiExtraction: prescription.aiExtractions[0] || null,
      activeQuote: formattedQuote,
    };
  }

  /**
   * Generates or updates an itemized quotation for an uploaded prescription.
   */
  async createPrescriptionQuote(
    prescriptionId: string,
    dto: CreatePrescriptionQuoteDto,
    userId: string,
  ) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
      include: { store: true },
    });
    if (!profile) {
      throw new ForbiddenException('Pharmacist profile not found for authenticated user.');
    }
    const store =
      profile.store || (await this.prisma.store.findFirst({ where: { status: 'ACTIVE' } }));
    if (!store) {
      throw new NotFoundException('No active pharmacy store found.');
    }

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription '${prescriptionId}' not found.`);
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('At least one medicine item must be included in quotation.');
    }

    // Calculate line totals and subtotal
    let subtotalNum = 0;
    const itemsData = dto.items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      if (item.isAvailable) {
        subtotalNum += lineTotal;
      }
      return {
        medicineId: item.medicineId || null,
        detectedMedicineName: item.detectedMedicineName || null,
        medicineNameSnapshot: item.medicineNameSnapshot,
        strengthSnapshot: item.strengthSnapshot || null,
        dosageFormSnapshot: item.dosageFormSnapshot || null,
        dosageInstructions: item.dosageInstructions || null,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        quantity: item.quantity,
        lineTotal: new Prisma.Decimal(lineTotal.toFixed(2)),
        isAvailable: item.isAvailable,
        unavailableReason: item.isAvailable ? null : item.unavailableReason || 'Unavailable at store',
      };
    });

    const subtotal = new Prisma.Decimal(subtotalNum.toFixed(2));
    const deliveryFeeNum = subtotalNum >= 500 || subtotalNum === 0 ? 0 : 50;
    const deliveryFee = new Prisma.Decimal(deliveryFeeNum.toFixed(2));
    const totalAmount = new Prisma.Decimal((subtotalNum + deliveryFeeNum).toFixed(2));

    const result = await this.prisma.$transaction(async (tx) => {
      // Mark any prior open quote as EXPIRED
      await tx.prescriptionQuote.updateMany({
        where: {
          prescriptionId,
          status: 'QUOTED',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // Create new quote
      const quote = await tx.prescriptionQuote.create({
        data: {
          prescriptionId,
          pharmacistId: userId,
          storeId: store.id,
          status: 'QUOTED',
          subtotal,
          deliveryFee,
          totalAmount,
          pharmacistNotes: dto.pharmacistNotes?.trim() || null,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Mark prescription as APPROVED (verified & priced)
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { status: PrescriptionStatus.APPROVED },
      });

      return quote;
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_QUOTED',
      resourceType: 'PrescriptionQuote',
      resourceId: result.id,
      metadata: {
        prescriptionId,
        storeId: store.id,
        totalAmount: Number(result.totalAmount),
        itemCount: result.items.length,
      },
    });

    const resolvedItems = Array.isArray(result.items) ? result.items : itemsData;

    return {
      ...result,
      subtotal: Number(result.subtotal),
      deliveryFee: Number(result.deliveryFee),
      totalAmount: Number(result.totalAmount),
      items: resolvedItems.map((i: any) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    };
  }

  /**
   * Rejects a prescription directly from verification screen.
   */
  async rejectPrescriptionDirectly(
    prescriptionId: string,
    dto: RejectPrescriptionDto,
    userId: string,
  ) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
      include: { store: true },
    });
    if (!profile) {
      throw new ForbiddenException('Pharmacist profile not found for authenticated user.');
    }
    const store =
      profile.store || (await this.prisma.store.findFirst({ where: { status: 'ACTIVE' } }));

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!prescription) {
      throw new NotFoundException(`Prescription '${prescriptionId}' not found.`);
    }

    const updated = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: PrescriptionStatus.REJECTED },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_REJECTED',
      resourceType: 'Prescription',
      resourceId: prescriptionId,
      metadata: {
        storeId: store.id,
        reason: dto.reason,
      },
    });

    return { success: true, status: updated.status, reason: dto.reason };
  }

  /**
   * Requests customer re-upload directly from verification screen.
   */
  async requestPrescriptionReuploadDirectly(
    prescriptionId: string,
    dto: RequestReuploadDto,
    userId: string,
  ) {
    const profile = await this.prisma.pharmacistProfile.findUnique({
      where: { userId },
      include: { store: true },
    });
    if (!profile) {
      throw new ForbiddenException('Pharmacist profile not found for authenticated user.');
    }
    const store =
      profile.store || (await this.prisma.store.findFirst({ where: { status: 'ACTIVE' } }));

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!prescription) {
      throw new NotFoundException(`Prescription '${prescriptionId}' not found.`);
    }

    const updated = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: PrescriptionStatus.REUPLOAD_REQUIRED },
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'PRESCRIPTION_REUPLOAD_REQUESTED',
      resourceType: 'Prescription',
      resourceId: prescriptionId,
      metadata: {
        storeId: store.id,
        reason: dto.reason,
      },
    });

    return { success: true, status: updated.status, reason: dto.reason };
  }
}
