import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrescriptionsService } from './prescriptions.service';
import { OrderStatus, OrderPaymentMethod, OrderPaymentStatus, Prisma } from '@prisma/client';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockAudit: any;
  let mockOrderNumberService: any;

  beforeEach(() => {
    mockPrisma = {
      prescription: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      prescriptionQuote: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      customerAddress: {
        findFirst: vi.fn(),
      },
      medicine: {
        findFirst: vi.fn().mockResolvedValue({ id: 'med-fallback', sku: 'SKU-FALLBACK' }),
      },
      order: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockStorage = {
      uploadPrescriptionFile: vi.fn(),
      getPresignedPrescriptionUrl: vi.fn(),
      prescriptionFileExists: vi.fn(),
      deletePrescriptionFile: vi.fn(),
    };

    mockAudit = {
      record: vi.fn(),
    };

    mockOrderNumberService = {
      generateOrderNumber: vi.fn().mockResolvedValue('ORD-2026-TEST-01'),
    };

    service = new PrescriptionsService(
      mockPrisma,
      mockStorage,
      mockAudit,
      mockOrderNumberService,
    );
  });

  it('1. getPrescriptionQuote returns formatted quotation if exists', async () => {
    mockPrisma.prescription.findFirst.mockResolvedValue({
      id: 'rx-1',
      customerUserId: 'user-1',
    });

    mockPrisma.prescriptionQuote.findFirst.mockResolvedValue({
      id: 'quote-1',
      prescriptionId: 'rx-1',
      pharmacistId: 'pharm-1',
      storeId: 'store-1',
      status: 'QUOTED',
      subtotal: new Prisma.Decimal('315.00'),
      deliveryFee: new Prisma.Decimal('50.00'),
      totalAmount: new Prisma.Decimal('365.00'),
      pharmacistNotes: 'Test advice',
      quotedAt: new Date('2026-11-08T10:00:00Z'),
      validUntil: null,
      orderId: null,
      items: [
        {
          id: 'qi-1',
          quoteId: 'quote-1',
          medicineId: 'med-1',
          detectedMedicineName: 'Omez 20',
          medicineNameSnapshot: 'Omeprazole 20 mg Capsule',
          strengthSnapshot: '20 mg',
          dosageFormSnapshot: 'Capsule',
          dosageInstructions: '1 OD',
          unitPrice: new Prisma.Decimal('65.00'),
          quantity: 2,
          lineTotal: new Prisma.Decimal('130.00'),
          isAvailable: true,
          unavailableReason: null,
          createdAt: new Date('2026-11-08T10:00:00Z'),
        },
      ],
    });

    const res = await service.getPrescriptionQuote('user-1', 'rx-1');

    expect(res).toBeDefined();
    expect(res?.id).toBe('quote-1');
    expect(res?.subtotal).toBe(315);
    expect(res?.totalAmount).toBe(365);
    expect(res?.items.length).toBe(1);
    expect(res?.items[0].medicineNameSnapshot).toBe('Omeprazole 20 mg Capsule');
  });

  it('2. acceptQuoteAndPay creates APPROVED order with verified items, updates quote to ACCEPTED', async () => {
    mockPrisma.prescription.findFirst.mockResolvedValue({
      id: 'rx-1',
      customerUserId: 'user-1',
      familyMemberId: null,
    });

    mockPrisma.prescriptionQuote.findFirst.mockResolvedValue({
      id: 'quote-1',
      prescriptionId: 'rx-1',
      pharmacistId: 'pharm-1',
      storeId: 'store-1',
      status: 'QUOTED',
      subtotal: new Prisma.Decimal('130.00'),
      deliveryFee: new Prisma.Decimal('50.00'),
      totalAmount: new Prisma.Decimal('180.00'),
      items: [
        {
          id: 'qi-1',
          medicineId: 'med-omeprazole-1',
          medicineNameSnapshot: 'Omeprazole 20 mg Capsule',
          unitPrice: new Prisma.Decimal('65.00'),
          quantity: 2,
          lineTotal: new Prisma.Decimal('130.00'),
          isAvailable: true,
          medicine: { id: 'med-omeprazole-1', sku: 'MED-OMP-20-001' },
        },
        {
          id: 'qi-2',
          medicineId: null,
          medicineNameSnapshot: 'Unavailable Specimen',
          unitPrice: new Prisma.Decimal('500.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('500.00'),
          isAvailable: false,
          unavailableReason: 'Out of stock',
        },
      ],
    });

    mockPrisma.customerAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      label: 'Home',
      recipientName: 'Debasish Ghosh',
      phone: '9876543210',
      addressLine1: 'Salt Lake Sector 1',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700064',
    });

    mockPrisma.order.create.mockResolvedValue({
      id: 'order-created-1',
      orderNumber: 'ORD-2026-TEST-01',
      status: OrderStatus.APPROVED,
      paymentMethod: OrderPaymentMethod.UPI,
      paymentStatus: OrderPaymentStatus.SUCCESS,
      subtotal: new Prisma.Decimal('130.00'),
      totalAmount: new Prisma.Decimal('180.00'),
    });

    const result = await service.acceptQuoteAndPay('user-1', 'rx-1', {
      quoteId: 'quote-1',
      addressId: 'addr-1',
      paymentMethod: OrderPaymentMethod.UPI,
      customerNote: 'Deliver before 5pm',
    });

    expect(result.id).toBe('order-created-1');
    expect(result.status).toBe(OrderStatus.APPROVED);

    // Verify order was created with ONLY the 1 available item (unavailable was omitted!)
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prescriptionId: 'rx-1',
          status: OrderStatus.APPROVED,
          paymentMethod: OrderPaymentMethod.UPI,
          items: {
            create: [
              expect.objectContaining({
                medicineNameSnapshot: 'Omeprazole 20 mg Capsule',
                quantity: 2,
                status: 'APPROVED',
              }),
            ],
          },
        }),
      }),
    );

    // Verify quote updated to ACCEPTED
    expect(mockPrisma.prescriptionQuote.update).toHaveBeenCalledWith({
      where: { id: 'quote-1' },
      data: {
        status: 'ACCEPTED',
        orderId: 'order-created-1',
      },
    });
  });
});
