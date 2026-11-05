import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandoverService } from './handover.service';
import {
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  StockReservationStatus,
  H1RegisterStatus,
  HandoverType,
  InventoryMovementType,
} from '@prisma/client';

describe('HandoverService', () => {
  let service: HandoverService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderPayment: {
        update: vi.fn(),
      },
      inventoryBalance: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      stockReservation: {
        update: vi.fn(),
      },
      inventoryMovement: {
        create: vi.fn(),
      },
      h1RegisterEntry: {
        update: vi.fn(),
      },
      orderHandover: {
        create: vi.fn(),
      },
      orderCodCollection: {
        create: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };
    mockAudit = {
      record: vi.fn(),
    };
    const mockRefills = {
      generateEstimatesForHandedOverOrder: vi.fn().mockResolvedValue([]),
    };
    service = new HandoverService(mockPrisma, mockAudit, mockRefills as any);
  });

  it('records handover: decrements physical on-hand stock, marks reservation CONSUMED, and completes H1 register', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-101',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.READY_FOR_HANDOVER,
      handover: null,
      stockReservations: [
        {
          id: 'res-1',
          medicineId: 'med-1',
          storeId: 'store-1',
          quantity: 2,
          status: StockReservationStatus.ACTIVE,
        },
      ],
      items: [
        {
          id: 'item-1',
          h1RegisterEntries: [
            { id: 'h1-1', status: H1RegisterStatus.PENDING_FULFILLMENT },
          ],
        },
      ],
    });

    mockPrisma.inventoryBalance.findUnique.mockResolvedValue({
      id: 'bal-1',
      quantity: 10, // 10 physical on hand
    });

    const handoverResult = await service.recordHandover({
      orderId: 'order-1',
      storeId: 'store-1',
      pharmacistUserId: 'pharma-1',
      handoverType: HandoverType.DELIVERY_PARTNER,
      recipientName: 'Courier Agent Raju',
      deliveryPartnerName: 'Shadowfax',
      referenceNumber: 'AWB-998877',
    });

    // 1. Physical inventory must be decremented: 10 - 2 = 8
    expect(mockPrisma.inventoryBalance.update).toHaveBeenCalledWith({
      where: { id: 'bal-1' },
      data: { quantity: 8 },
    });

    // 2. Reservation marked CONSUMED
    expect(mockPrisma.stockReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-1' },
        data: expect.objectContaining({ status: StockReservationStatus.CONSUMED }),
      }),
    );

    // 3. STOCK_DISPENSED movement logged
    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: InventoryMovementType.STOCK_DISPENSED,
        quantityBefore: 10,
        quantityChange: -2,
        quantityAfter: 8,
      }),
    });

    // 4. H1 register entry updated to COMPLETED
    expect(mockPrisma.h1RegisterEntry.update).toHaveBeenCalledWith({
      where: { id: 'h1-1' },
      data: { status: H1RegisterStatus.COMPLETED },
    });

    // 5. Order moved to HANDED_OVER
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: OrderStatus.HANDED_OVER },
    });
  });

  it('records COD payment collection with exact amount matching total due', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-101',
      fulfilmentStoreId: 'store-1',
      paymentMethod: OrderPaymentMethod.COD,
      totalAmount: 450.0,
      payment: { id: 'pay-1', status: OrderPaymentStatus.PENDING },
      codCollection: null,
    });

    // Reject incorrect collection amount
    await expect(
      service.recordCodCollection({
        orderId: 'order-1',
        storeId: 'store-1',
        pharmacistUserId: 'pharma-1',
        amount: 400.0, // Short payment
      }),
    ).rejects.toThrow('Collected amount (₹400.00) must match the exact total due (₹450.00).');

    // Accept exact payment
    await service.recordCodCollection({
      orderId: 'order-1',
      storeId: 'store-1',
      pharmacistUserId: 'pharma-1',
      amount: 450.0,
      paymentReference: 'CASH-REC-101',
    });

    expect(mockPrisma.orderCodCollection.create).toHaveBeenCalled();
    expect(mockPrisma.orderPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: OrderPaymentStatus.SUCCESS }),
      }),
    );
  });
});
