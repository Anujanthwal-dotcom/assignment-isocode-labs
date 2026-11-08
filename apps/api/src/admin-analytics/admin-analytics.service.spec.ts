import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAnalyticsService } from './admin-analytics.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        count: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 1250 } }),
      },
      user: {
        count: vi.fn().mockResolvedValue(5),
      },
      store: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      refillSubscription: {
        count: vi.fn(),
      },
      orderHandover: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      prescriptionReview: {
        findMany: vi.fn(),
      },
      orderItemReview: {
        findMany: vi.fn(),
      },
      orderRoutingDecision: {
        count: vi.fn(),
      },
      stockReservation: {
        count: vi.fn(),
      },
      orderStatusHistory: {
        findMany: vi.fn(),
      },
      refillEstimate: {
        count: vi.fn(),
      },
      refillReminder: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        count: vi.fn(),
      },
    };

    service = new AdminAnalyticsService(mockPrisma);
  });

  it('1. Calculates high-level overview metrics using actual DB aggregates', async () => {
    mockPrisma.order.count.mockResolvedValue(10);
    mockPrisma.store.count.mockResolvedValue(3);
    mockPrisma.refillSubscription.count.mockResolvedValue(4);

    const res = await service.getOverview('30D');
    expect(res.totalOrders).toBe(10);
    expect(res.activeStoresCount).toBe(3);
    expect(res.activeRefillSubscriptionsCount).toBe(4);
    expect(res.totalRevenue).toBe(1250);
    expect(res.customersCount).toBe(5);
    expect(res.dateRange.period).toBe('30D');
  });

  it('2. Calculates true median verification time excluding pending reviews', async () => {
    const t0 = new Date('2026-11-01T10:00:00.000Z');
    // Review 1: 10 mins
    const r1 = {
      status: 'APPROVED',
      createdAt: t0,
      reviewedAt: new Date(t0.getTime() + 10 * 60 * 1000),
      order: { reviewAssignments: [{ assignedAt: t0 }] },
    };
    // Review 2: 20 mins
    const r2 = {
      status: 'APPROVED',
      createdAt: t0,
      reviewedAt: new Date(t0.getTime() + 20 * 60 * 1000),
      order: { reviewAssignments: [{ assignedAt: t0 }] },
    };
    // Review 3: 30 mins
    const r3 = {
      status: 'REJECTED',
      createdAt: t0,
      reviewedAt: new Date(t0.getTime() + 30 * 60 * 1000),
      order: { reviewAssignments: [{ assignedAt: t0 }] },
    };
    // Review 4: Pending review (must be excluded from duration)
    const r4 = {
      status: 'IN_REVIEW',
      createdAt: t0,
      reviewedAt: null,
      order: { reviewAssignments: [{ assignedAt: t0 }] },
    };

    mockPrisma.prescriptionReview.findMany.mockResolvedValue([r1, r2, r3, r4]);
    mockPrisma.orderItemReview.findMany.mockResolvedValue([]);
    mockPrisma.store.findMany.mockResolvedValue([]);

    const res = await service.getVerificationAnalytics('30D');
    expect(res.totalPrescriptionsReviewed).toBe(4);
    expect(res.approvedCount).toBe(2);
    expect(res.rejectedCount).toBe(1);
    expect(res.pendingReviewCount).toBe(1);
    // Median of [10, 20, 30] is 20
    expect(res.medianVerificationMinutes).toBe(20);
    // Average of [10, 20, 30] is 20
    expect(res.averageVerificationMinutes).toBe(20);
  });

  it('3. Refill conversion handles zero denominators safely', async () => {
    mockPrisma.refillSubscription.count.mockResolvedValue(5);
    mockPrisma.refillEstimate.count.mockResolvedValue(10);
    mockPrisma.refillReminder.count.mockResolvedValue(0); // 0 sent
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.refillReminder.findMany.mockResolvedValue([]);

    const res = await service.getRefillAnalytics('30D');
    expect(res.remindersSent).toBe(0);
    expect(res.conversionRatePercentage).toBe(0);
  });
});
