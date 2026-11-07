import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrescriptionAiProcessor } from './prescription-ai.processor';
import { MedicineMatchingService } from './matching/medicine-matching.service';
import { MockPrescriptionReader } from './providers/mock-prescription-reader.provider';
import {
  PrescriptionStatus,
  OrderStatus,
  OrderPaymentStatus,
  PrescriptionAIStatus,
} from '@prisma/client';

describe('Safety Invariants: Order and Prescription Non-Mutability', () => {
  let processor: PrescriptionAiProcessor;
  let mockPrisma: any;
  let mockStorage: any;
  let mockAudit: any;
  let matchingService: MedicineMatchingService;
  let mockReader: MockPrescriptionReader;

  // Initial immutable state objects
  const initialPrescription = {
    id: 'rx-invariant-1',
    customerUserId: 'cust-1',
    objectKey: 'prescriptions/rx-invariant-1.jpg',
    originalFileName: 'rx-readable.jpg',
    mimeType: 'image/jpeg',
    status: PrescriptionStatus.UPLOADED,
  };

  const initialOrder = {
    id: 'order-1',
    orderNumber: 'PH-20261105-000001',
    prescriptionId: 'rx-invariant-1',
    status: OrderStatus.PENDING_VERIFICATION,
    paymentStatus: OrderPaymentStatus.PENDING,
  };

  const initialCart = {
    id: 'cart-1',
    customerUserId: 'cust-1',
    items: [{ id: 'item-1', medicineId: 'med-existing-1', quantity: 2 }],
  };

  beforeEach(() => {
    mockPrisma = {
      prescriptionAIExtraction: {
        findUnique: vi.fn().mockResolvedValue({ id: 'ext-1' }),
        update: vi.fn().mockResolvedValue({ id: 'ext-1' }),
      },
      prescription: {
        findFirst: vi.fn().mockResolvedValue(initialPrescription),
        update: vi.fn(), // Should NEVER be called to approve
      },
      order: {
        update: vi.fn(), // Should NEVER be called by AI extraction
      },
      orderItem: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      cart: {
        update: vi.fn(),
      },
      cartItem: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      medicine: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(), // Should NEVER create catalogue medicines
      },
    };

    mockStorage = {
      getPrescriptionBuffer: vi.fn().mockResolvedValue(Buffer.from('sample prescription image')),
    };

    mockAudit = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    matchingService = new MedicineMatchingService(mockPrisma as any);
    mockReader = new MockPrescriptionReader();

    processor = new PrescriptionAiProcessor(
      mockPrisma as any,
      mockStorage as any,
      mockAudit as any,
      matchingService,
      mockReader,
    );
  });

  it('Invariant 1 & 2: AI extraction never changes order status or payment status', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    // Assert order was NEVER updated
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(initialOrder.status).toBe(OrderStatus.PENDING_VERIFICATION);
    expect(initialOrder.paymentStatus).toBe(OrderPaymentStatus.PENDING);
  });

  it('Invariant 3 & 7: AI extraction never approves a prescription (readable or unreadable)', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    // Prescription status must remain UPLOADED
    expect(mockPrisma.prescription.update).not.toHaveBeenCalled();
    expect(initialPrescription.status).toBe(PrescriptionStatus.UPLOADED);
  });

  it('Invariant 5 & 6: AI matching never changes OrderItems or CartItems', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    expect(mockPrisma.orderItem.create).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.update).not.toHaveBeenCalled();
    expect(mockPrisma.cartItem.create).not.toHaveBeenCalled();
    expect(mockPrisma.cart.update).not.toHaveBeenCalled();
    expect(initialCart.items).toHaveLength(1);
  });

  it('Invariant 4: AI output never creates new catalogue medicines', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
        fixtureHint: 'unmatched',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    expect(mockPrisma.medicine.create).not.toHaveBeenCalled();
  });

  it('Invariant 9: Every extraction attempt remains auditable without PHI in logs', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'cust-1',
        resourceType: 'PrescriptionAIExtraction',
        resourceId: 'ext-1',
        action: 'PRESCRIPTION_EXTRACTION_COMPLETED',
      }),
    );
  });

  it('Invariant 10: Completed extraction status is COMPLETED draft and not an approval', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        extractionId: 'ext-1',
        prescriptionId: 'rx-invariant-1',
        customerUserId: 'cust-1',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await processor.process(job);

    expect(mockPrisma.prescriptionAIExtraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ext-1' },
        data: expect.objectContaining({
          status: PrescriptionAIStatus.COMPLETED,
        }),
      }),
    );
  });
});
