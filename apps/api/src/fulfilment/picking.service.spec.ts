import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PickingService } from './picking.service';
import { OrderStatus, PickingItemStatus } from '@prisma/client';

describe('PickingService', () => {
  let service: PickingService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockOrderStatus: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderItemPicking: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };
    mockAudit = {
      record: vi.fn(),
    };
    mockOrderStatus = {
      validateTransition: vi.fn(),
    };
    service = new PickingService(mockPrisma, mockAudit, mockOrderStatus);
  });

  it('starts picking checklist for approved order items only', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.STOCK_RESERVED,
      stockReservations: [{ id: 'res-1' }],
      items: [
        {
          id: 'item-1',
          medicineId: 'med-1',
          quantity: 2,
          status: 'PENDING_VERIFICATION',
          reviews: [{ status: 'APPROVED' }],
          picking: null,
        },
        {
          id: 'item-2',
          medicineId: 'med-2',
          quantity: 1,
          status: 'REJECTED', // Rejected item must be excluded from picking checklist
          reviews: [{ status: 'REJECTED' }],
          picking: null,
        },
      ],
    });

    const res = await service.startPicking('order-1', 'store-1', 'pharmacist-1');

    expect(res.status).toBe(OrderStatus.PICKING);
    // Only item-1 gets picking checklist created
    expect(mockPrisma.orderItemPicking.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.orderItemPicking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderItemId: 'item-1',
          quantityRequired: 2,
          status: PickingItemStatus.PENDING,
        }),
      }),
    );
  });

  it('prevents cross-store picking access', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.STOCK_RESERVED,
    });

    await expect(service.startPicking('order-1', 'store-OTHER', 'pharmacist-1')).rejects.toThrow(
      'Order is assigned to another fulfillment store.',
    );
  });

  it('rejects picking more than reserved required quantity', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.PICKING,
    });
    mockPrisma.orderItemPicking.findUnique.mockResolvedValue({
      id: 'pick-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      quantityRequired: 2,
      medicine: { name: 'Paracetamol' },
    });

    await expect(
      service.confirmItemPicked('order-1', 'item-1', 5, 'store-1', 'pharmacist-1'),
    ).rejects.toThrow('Picked quantity (5) cannot exceed required quantity (2).');
  });

  it('records item exception reason and marks picking exception', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.PICKING,
    });
    mockPrisma.orderItemPicking.findUnique.mockResolvedValue({
      id: 'pick-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      medicine: { name: 'Paracetamol' },
    });
    mockPrisma.orderItemPicking.update.mockResolvedValue({
      id: 'pick-1',
      status: PickingItemStatus.EXCEPTION,
      exceptionReason: 'Bottle seal broken',
    });

    const res = await service.reportItemException(
      'order-1',
      'item-1',
      'Bottle seal broken',
      'store-1',
      'pharmacist-1',
    );

    expect(res.status).toBe(PickingItemStatus.EXCEPTION);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PICKING_ITEM_EXCEPTION',
      }),
    );
  });

  it('starts picking from APPROVED status when stock is reserved', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-approved-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.APPROVED,
      stockReservations: [{ id: 'res-1' }],
      items: [
        {
          id: 'item-1',
          medicineId: 'med-1',
          quantity: 2,
          status: 'APPROVED',
          reviews: [],
          picking: null,
        },
      ],
    });

    const res = await service.startPicking('order-approved-1', 'store-1', 'pharmacist-1');

    expect(res.status).toBe(OrderStatus.PICKING);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-approved-1' },
        data: { status: OrderStatus.PICKING },
      }),
    );
  });
});
