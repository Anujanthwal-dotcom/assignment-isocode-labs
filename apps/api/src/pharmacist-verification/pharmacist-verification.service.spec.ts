import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PharmacistVerificationService } from './pharmacist-verification.service';
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
  MedicineSchedule,
} from '@prisma/client';
import {
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';

describe('PharmacistVerificationService', () => {
  let service: PharmacistVerificationService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockAudit: any;
  let mockCompliance: any;

  const mockStore = {
    id: 'store-kol-1',
    code: 'KOL-001',
    name: 'Salt Lake Store',
  };

  const mockPharmacistProfile = {
    id: 'pharm-profile-1',
    userId: 'user-pharm-1',
    storeId: 'store-kol-1',
    store: mockStore,
  };

  beforeEach(() => {
    mockPrisma = {
      pharmacistProfile: {
        findUnique: vi.fn().mockResolvedValue(mockPharmacistProfile),
      },
      order: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderReviewAssignment: {
        findFirst: vi.fn(),
      },
      prescriptionReview: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderItemReview: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orderItemAlternativeProposal: {
        create: vi.fn(),
      },
      prescription: {
        update: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      medicine: {
        findUnique: vi.fn(),
      },
      h1RegisterEntry: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockStorage = {
      getPresignedPrescriptionUrl: vi
        .fn()
        .mockResolvedValue('https://minio.internal/presigned-url?token=xyz'),
    };

    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockCompliance = {
      evaluate: vi.fn(),
    };

    service = new PharmacistVerificationService(
      mockPrisma as unknown as PrismaService,
      mockStorage as unknown as StorageService,
      mockAudit as unknown as AuditService,
      mockCompliance as unknown as ComplianceEvaluatorService,
    );
  });

  it('1. Pharmacist sees orders assigned to their store in review queue', async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'ord-1',
        orderNumber: 'ORD-101',
        placedAt: new Date(),
        status: OrderStatus.PENDING_VERIFICATION,
        prescriptionId: 'rx-1',
        prescription: { status: PrescriptionStatus.UPLOADED },
        prescriptionReviews: [],
        items: [{ medicineNameSnapshot: 'Metformin 500 mg' }],
        customerUser: { customerProfile: { fullName: 'Test Patient' } },
        familyMember: null,
      },
    ]);

    const res = await service.getQueue('user-pharm-1');

    expect(res.store.id).toBe(mockStore.id);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].orderNumber).toBe('ORD-101');
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reviewAssignments: {
            some: {
              storeId: mockStore.id,
              unassignedAt: null,
            },
          },
        }),
      }),
    );
  });

  it('2. Pharmacist cannot access an order assigned to a different store (403 Forbidden)', async () => {
    mockPrisma.orderReviewAssignment.findFirst.mockResolvedValue({
      id: 'assign-other',
      orderId: 'ord-2',
      storeId: 'store-howrah-2',
      store: { code: 'HOW-001' },
    });

    await expect(service.getReviewDetail('ord-2', 'user-pharm-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('3. Pharmacist cannot access an unassigned order (403 Forbidden)', async () => {
    mockPrisma.orderReviewAssignment.findFirst.mockResolvedValue(null);

    await expect(service.getReviewDetail('ord-unassigned', 'user-pharm-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('4. Pharmacist can view original prescription securely via short-lived signed URL', async () => {
    mockPrisma.orderReviewAssignment.findFirst.mockResolvedValue({
      id: 'assign-1',
      orderId: 'ord-1',
      storeId: mockStore.id,
      store: mockStore,
    });

    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'ORD-101',
      prescriptionId: 'rx-1',
      prescription: {
        id: 'rx-1',
        objectKey: 'prescriptions/rx-1.pdf',
        originalFileName: 'prescription.pdf',
        mimeType: 'application/pdf',
        status: PrescriptionStatus.UPLOADED,
        aiExtractions: [],
      },
      items: [],
      customerUser: { id: 'cust-1' },
      prescriptionReviews: [
        { id: 'rev-1', storeId: mockStore.id, status: PrescriptionReviewStatus.IN_REVIEW },
      ],
    });

    const detail = await service.getReviewDetail('ord-1', 'user-pharm-1');

    expect(detail.prescription.viewUrl).toBe('https://minio.internal/presigned-url?token=xyz');
    expect(mockStorage.getPresignedPrescriptionUrl).toHaveBeenCalledWith(
      'prescriptions/rx-1.pdf',
      300,
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRESCRIPTION_DOCUMENT_VIEWED' }),
    );
  });

  it('5. Pharmacist can correct extracted fields on item review', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.orderItemReview.findFirst.mockResolvedValue({
      id: 'item-rev-1',
      prescriptionReviewId: 'rev-1',
      orderItemId: 'item-1',
      medicineId: 'med-1',
    });

    mockPrisma.orderItemReview.update.mockResolvedValue({
      id: 'item-rev-1',
      reviewedDosageInstructions: '1 tablet twice daily after meals',
    });

    const res = await service.updateItemReview(
      'rev-1',
      'item-1',
      { reviewedDosageInstructions: '1 tablet twice daily after meals' },
      'user-pharm-1',
    );

    expect(res.reviewedDosageInstructions).toBe('1 tablet twice daily after meals');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDER_ITEM_REVIEW_FIELDS_CORRECTED' }),
    );
  });

  it('6. Pharmacist can approve an eligible medicine item after compliance check', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-1',
      orderId: 'ord-1',
      medicineId: 'med-par-1',
      medicine: { id: 'med-par-1', name: 'Paracetamol 500 mg', schedule: MedicineSchedule.OTC },
      order: { prescriptionId: 'rx-1' },
    });

    mockPrisma.orderItemReview.findFirst.mockResolvedValue({
      id: 'item-rev-1',
      prescriptionReviewId: 'rev-1',
      orderItemId: 'item-1',
      medicineId: 'med-par-1',
    });

    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-par-1',
      name: 'Paracetamol 500 mg',
      schedule: MedicineSchedule.OTC,
    });

    mockCompliance.evaluate.mockResolvedValue({
      medicineId: 'med-par-1',
      schedule: MedicineSchedule.OTC,
      decision: 'ALLOWED_FOR_REVIEW',
      canApprove: true,
      reasons: ['OTC eligible for review'],
      ruleVersionId: 'ruleset-1',
    });

    mockPrisma.orderItemReview.update.mockResolvedValue({
      id: 'item-rev-1',
      status: OrderItemReviewStatus.APPROVED,
    });

    const approved = await service.approveItem('rev-1', 'item-1', {}, 'user-pharm-1');

    expect(approved.status).toBe(OrderItemReviewStatus.APPROVED);
    expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { status: OrderItemStatus.APPROVED },
    });
  });

  it('7. Pharmacist CANNOT approve a blocked item (Schedule X / Narcotic)', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-x',
      orderId: 'ord-1',
      medicineId: 'med-x-1',
      medicine: { id: 'med-x-1', name: 'Ritalin 10 mg', schedule: MedicineSchedule.SCHEDULE_X },
      order: { prescriptionId: 'rx-1' },
    });

    mockPrisma.orderItemReview.findFirst.mockResolvedValue({
      id: 'item-rev-x',
      prescriptionReviewId: 'rev-1',
      orderItemId: 'item-x',
      medicineId: 'med-x-1',
    });

    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-x-1',
      name: 'Ritalin 10 mg',
      schedule: MedicineSchedule.SCHEDULE_X,
    });

    mockCompliance.evaluate.mockResolvedValue({
      medicineId: 'med-x-1',
      schedule: MedicineSchedule.SCHEDULE_X,
      decision: 'BLOCKED',
      canApprove: false,
      reasons: ['Schedule X substances are not permitted for online dispensing.'],
      ruleVersionId: 'ruleset-1',
    });

    await expect(service.approveItem('rev-1', 'item-x', {}, 'user-pharm-1')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('8. Pharmacist can reject an item with mandatory reason', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.orderItemReview.findFirst.mockResolvedValue({
      id: 'item-rev-1',
      prescriptionReviewId: 'rev-1',
      orderItemId: 'item-1',
    });

    mockPrisma.orderItemReview.update.mockResolvedValue({
      id: 'item-rev-1',
      status: OrderItemReviewStatus.REJECTED,
      decisionReason: 'Dosage prescribed exceeds safe daily threshold',
    });

    const res = await service.rejectItem(
      'rev-1',
      'item-1',
      { reason: 'Dosage prescribed exceeds safe daily threshold' },
      'user-pharm-1',
    );

    expect(res.status).toBe(OrderItemReviewStatus.REJECTED);
    expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { status: OrderItemStatus.REJECTED },
    });
  });

  it('9. Cannot approve prescription while any item remains pending review', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1',
      items: [
        { id: 'item-1', reviews: [{ status: OrderItemReviewStatus.APPROVED }] },
        { id: 'item-2', reviews: [{ status: OrderItemReviewStatus.PENDING }] }, // pending item!
      ],
    });

    await expect(service.approvePrescription('rev-1', 'user-pharm-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('10. Approving prescription with mix of approved and rejected items marks order PARTIALLY_APPROVED', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
      prescriptionId: 'rx-1',
    });

    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1',
      status: OrderStatus.UNDER_REVIEW,
      items: [
        { id: 'item-1', reviews: [{ status: OrderItemReviewStatus.APPROVED }] },
        { id: 'item-2', reviews: [{ status: OrderItemReviewStatus.REJECTED }] },
      ],
    });

    mockPrisma.prescriptionReview.update.mockResolvedValue({
      id: 'rev-1',
      status: PrescriptionReviewStatus.APPROVED,
    });

    await service.approvePrescription('rev-1', 'user-pharm-1');

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'ord-1' },
      data: { status: OrderStatus.PARTIALLY_APPROVED },
    });
  });

  it('11. Generic alternative proposal validates same active ingredient (genericName)', async () => {
    mockPrisma.prescriptionReview.findUnique.mockResolvedValue({
      id: 'rev-1',
      storeId: mockStore.id,
      orderId: 'ord-1',
    });

    mockPrisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-1',
      orderId: 'ord-1',
      medicine: {
        id: 'med-par-1',
        name: 'Crocin 500 mg',
        genericName: 'Paracetamol',
        mrp: 20.0,
        schedule: MedicineSchedule.OTC,
      },
    });

    // Incompatible generic name (Ibuprofen instead of Paracetamol)
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-ibu-1',
      name: 'Brufen 400 mg',
      genericName: 'Ibuprofen',
      mrp: 25.0,
      schedule: MedicineSchedule.OTC,
    });

    await expect(
      service.proposeAlternative(
        'rev-1',
        'item-1',
        { proposedMedicineId: 'med-ibu-1', reason: 'Better brand' },
        'user-pharm-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
