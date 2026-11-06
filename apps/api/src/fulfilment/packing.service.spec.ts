import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackingService } from './packing.service';
import { OrderStatus, PickingItemStatus } from '@prisma/client';

describe('PackingService', () => {
  let service: PackingService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockInvoice: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
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
    mockInvoice = {
      generateInvoiceForOrder: vi
        .fn()
        .mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-KOL-001-20261105-0001' }),
    };
    service = new PackingService(mockPrisma, mockAudit, mockInvoice);
  });

  it('rejects packing completion if any approved item is not yet PICKED', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.PICKING,
      items: [
        {
          id: 'item-1',
          reviews: [{ status: 'APPROVED' }],
          status: 'PENDING_VERIFICATION',
          picking: { status: PickingItemStatus.PICKED },
        },
        {
          id: 'item-2',
          reviews: [{ status: 'APPROVED' }],
          status: 'PENDING_VERIFICATION',
          picking: { status: PickingItemStatus.PENDING }, // Pending item!
        },
      ],
    });

    await expect(service.completePacking('order-1', 'store-1', 'pharma-1')).rejects.toThrow(
      'Cannot complete packing. 1 item(s) are not fully picked or have exceptions.',
    );
  });

  it('completes packing, records audit, and automatically generates invoice', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      fulfilmentStoreId: 'store-1',
      status: OrderStatus.PICKING,
      items: [
        {
          id: 'item-1',
          reviews: [{ status: 'APPROVED' }],
          status: 'PENDING_VERIFICATION',
          picking: { status: PickingItemStatus.PICKED },
        },
      ],
    });

    const res = await service.completePacking(
      'order-1',
      'store-1',
      'pharma-1',
      'Double-boxed securely',
    );

    expect(res.status).toBe(OrderStatus.READY_FOR_HANDOVER);
    expect(res.invoiceNumber).toBe('INV-KOL-001-20261105-0001');
    expect(mockInvoice.generateInvoiceForOrder).toHaveBeenCalledWith(
      'order-1',
      'store-1',
      'pharma-1',
    );
  });
});
