import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewAssignmentService } from './review-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StoreStatus, OrderStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReviewAssignmentService', () => {
  let service: ReviewAssignmentService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      store: {
        findUnique: vi.fn(),
      },
      orderReviewAssignment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };
    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new ReviewAssignmentService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  it('throws NotFoundException if order does not exist', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(
      service.assignOrder('order-not-found', { storeId: 'store-1' }, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if target store is inactive or not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      reviewAssignments: [],
    });
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.INACTIVE,
    });

    await expect(
      service.assignOrder('order-1', { storeId: 'store-1' }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates initial review assignment and audits it', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-101',
      reviewAssignments: [],
    });
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.ACTIVE,
      code: 'KOL-001',
    });
    mockPrisma.orderReviewAssignment.create.mockResolvedValue({
      id: 'assign-1',
      orderId: 'order-1',
      storeId: 'store-1',
      store: { id: 'store-1', code: 'KOL-001' },
      assignedByUser: { id: 'admin-1', email: 'admin@example.com' },
    });

    const res = await service.assignOrder('order-1', { storeId: 'store-1', reason: 'Initial assignment' }, 'admin-1');

    expect(res.id).toBe('assign-1');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDER_REVIEW_ASSIGNED' }),
    );
  });

  it('deactivates previous active assignment when reassigning', async () => {
    const activeAssignment = { id: 'old-assign-1', storeId: 'store-old' };
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-101',
      reviewAssignments: [activeAssignment],
    });
    mockPrisma.store.findUnique.mockResolvedValue({
      id: 'store-new',
      status: StoreStatus.ACTIVE,
      code: 'HOW-001',
    });
    mockPrisma.orderReviewAssignment.create.mockResolvedValue({
      id: 'new-assign-1',
      orderId: 'order-1',
      storeId: 'store-new',
      store: { id: 'store-new', code: 'HOW-001' },
      assignedByUser: { id: 'admin-1', email: 'admin@example.com' },
    });

    await service.assignOrder('order-1', { storeId: 'store-new', reason: 'Reassigning store' }, 'admin-1');

    expect(mockPrisma.orderReviewAssignment.update).toHaveBeenCalledWith({
      where: { id: 'old-assign-1' },
      data: expect.objectContaining({ unassignedAt: expect.any(Date) }),
    });
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDER_REVIEW_REASSIGNED' }),
    );
  });
});
