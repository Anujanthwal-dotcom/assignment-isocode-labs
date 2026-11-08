import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrescriptionsService } from './prescriptions.service';
import { StoreDistanceService } from '../order-routing/store-distance.service';
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
        findMany: vi.fn().mockResolvedValue([]),
      },
      store: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      inventoryBalance: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      stockReservation: {
        groupBy: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
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
      new StoreDistanceService(),
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

  it('3. acceptQuoteAndPay splits orders across multiple stores when stock is divided, linking both to prescription', async () => {
    mockPrisma.prescription.findFirst.mockResolvedValue({
      id: 'rx-split-1',
      customerUserId: 'user-1',
      familyMemberId: null,
    });

    mockPrisma.prescriptionQuote.findFirst.mockResolvedValue({
      id: 'quote-split-1',
      prescriptionId: 'rx-split-1',
      pharmacistId: 'pharm-1',
      status: 'QUOTED',
      subtotal: new Prisma.Decimal('500.00'),
      deliveryFee: new Prisma.Decimal('40.00'),
      totalAmount: new Prisma.Decimal('540.00'),
      items: [
        {
          id: 'item-1',
          medicineId: 'med-store-1-only',
          medicineNameSnapshot: 'Medicine A',
          unitPrice: new Prisma.Decimal('200.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('200.00'),
          isAvailable: true,
          medicine: { sku: 'SKU-MED-A' },
        },
        {
          id: 'item-2',
          medicineId: 'med-store-2-only',
          medicineNameSnapshot: 'Medicine B',
          unitPrice: new Prisma.Decimal('300.00'),
          quantity: 1,
          lineTotal: new Prisma.Decimal('300.00'),
          isAvailable: true,
          medicine: { sku: 'SKU-MED-B' },
        },
      ],
    });

    mockPrisma.customerAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      label: 'Home',
      recipientName: 'Debasish Ghosh',
      phone: '9830098300',
      addressLine1: 'Salt Lake Sector 1',
      latitude: 22.5867,
      longitude: 88.4178,
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700064',
    });

    // 2 active stores
    mockPrisma.store.findMany.mockResolvedValue([
      { id: 'store-1', code: 'KOL-001', name: 'Salt Lake Store', latitude: 22.585, longitude: 88.415 },
      { id: 'store-2', code: 'HOW-001', name: 'Howrah Store', latitude: 22.595, longitude: 88.35 },
    ]);

    // Store 1 has Medicine A only, Store 2 has Medicine B only
    mockPrisma.inventoryBalance.findMany.mockResolvedValue([
      { storeId: 'store-1', medicineId: 'med-store-1-only', quantity: 10 },
      { storeId: 'store-1', medicineId: 'med-store-2-only', quantity: 0 },
      { storeId: 'store-2', medicineId: 'med-store-1-only', quantity: 0 },
      { storeId: 'store-2', medicineId: 'med-store-2-only', quantity: 10 },
    ]);

    mockPrisma.stockReservation.groupBy.mockResolvedValue([]);

    let orderCount = 0;
    mockPrisma.order.create.mockImplementation(async ({ data }: any) => {
      orderCount++;
      return {
        id: `order-split-${orderCount}`,
        orderNumber: `ORD-SPLIT-0${orderCount}`,
        status: data.status,
        fulfilmentStoreId: data.fulfilmentStoreId,
        totalAmount: data.totalAmount,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        items: data.items.create,
      };
    });

    const result = await service.acceptQuoteAndPay('user-1', 'rx-split-1', {
      quoteId: 'quote-split-1',
      addressId: 'addr-1',
      paymentMethod: OrderPaymentMethod.UPI,
    });

    // Expect split flag and 2 orders created
    expect(result.isSplit).toBe(true);
    expect(result.splitOrders.length).toBe(2);
    expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);

    // Both orders must have prescriptionId = rx-split-1
    expect(mockPrisma.order.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          prescriptionId: 'rx-split-1',
          fulfilmentStoreId: 'store-1',
        }),
      }),
    );
    expect(mockPrisma.order.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          prescriptionId: 'rx-split-1',
          fulfilmentStoreId: 'store-2',
        }),
      }),
    );

    // Sum of subtotal + deliveryFee matches the quote total
    const totalCharged = result.splitOrders.reduce(
      (sum: number, o: any) => sum + Number(o.totalAmount),
      0,
    );
    expect(totalCharged).toBe(540);
  });
});
