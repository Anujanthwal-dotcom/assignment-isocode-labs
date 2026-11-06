import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefillsService } from './refills.service';
import { RefillCalculationService } from './refill-calculation.service';
import { RefillSchedulerService } from './refill-scheduler.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RefillEligibilityStatus, RefillSubscriptionStatus } from '@prisma/client';

describe('RefillsService - Subscriptions & Lifecycle', () => {
  let service: RefillsService;
  let mockPrisma: any;
  let mockAudit: any;
  let calculationService: RefillCalculationService;
  let mockScheduler: any;
  let mockNotifications: any;
  let mockCart: any;

  beforeEach(() => {
    calculationService = new RefillCalculationService();
    mockAudit = { record: vi.fn().mockResolvedValue({}) };
    mockScheduler = {
      scheduleReminderForSubscription: vi.fn().mockResolvedValue(undefined),
      cancelScheduledRemindersForSubscription: vi.fn().mockResolvedValue(undefined),
    };
    mockNotifications = { send: vi.fn().mockResolvedValue({ id: 'notif-1' }) };
    mockCart = { addItem: vi.fn().mockResolvedValue({ id: 'cart-1' }) };

    mockPrisma = {
      refillEstimate: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      refillSubscription: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      refillReminder: {
        findMany: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
      },
    };

    service = new RefillsService(
      mockPrisma,
      mockAudit,
      calculationService,
      mockScheduler,
      mockNotifications,
      mockCart,
    );
  });

  it('1. Customer can opt in to refill reminders with valid estimate', async () => {
    mockPrisma.refillEstimate.findUnique.mockResolvedValue({
      id: 'est-1',
      customerId: 'cust-1',
      medicineId: 'med-1',
      familyMemberId: null,
      eligibilityStatus: RefillEligibilityStatus.ELIGIBLE,
      medicine: { name: 'Metformin 500mg' },
    });
    mockPrisma.refillSubscription.findFirst.mockResolvedValue(null);
    mockPrisma.refillSubscription.create.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-1',
      medicineId: 'med-1',
      status: RefillSubscriptionStatus.ACTIVE,
      reminderDaysBefore: 5,
    });

    const res = await service.createSubscription('cust-1', {
      refillEstimateId: 'est-1',
      reminderDaysBefore: 5,
    });

    expect(res.id).toBe('sub-1');
    expect(mockScheduler.scheduleReminderForSubscription).toHaveBeenCalledWith('sub-1');
  });

  it('2. Customer can pause active subscription and cancel scheduled reminders', async () => {
    mockPrisma.refillSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-1',
      status: RefillSubscriptionStatus.ACTIVE,
    });
    mockPrisma.refillSubscription.update.mockResolvedValue({
      id: 'sub-1',
      status: RefillSubscriptionStatus.PAUSED,
    });

    const res = await service.pauseSubscription('cust-1', 'sub-1');
    expect(res.status).toBe(RefillSubscriptionStatus.PAUSED);
    expect(mockScheduler.cancelScheduledRemindersForSubscription).toHaveBeenCalledWith('sub-1');
  });

  it('3. Customer can resume paused subscription', async () => {
    mockPrisma.refillSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-1',
      status: RefillSubscriptionStatus.PAUSED,
    });
    mockPrisma.refillSubscription.update.mockResolvedValue({
      id: 'sub-1',
      status: RefillSubscriptionStatus.ACTIVE,
    });

    const res = await service.resumeSubscription('cust-1', 'sub-1');
    expect(res.status).toBe(RefillSubscriptionStatus.ACTIVE);
    expect(mockScheduler.scheduleReminderForSubscription).toHaveBeenCalledWith('sub-1');
  });

  it('4. Customer can cancel subscription', async () => {
    mockPrisma.refillSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-1',
      status: RefillSubscriptionStatus.ACTIVE,
    });
    mockPrisma.refillSubscription.update.mockResolvedValue({
      id: 'sub-1',
      status: RefillSubscriptionStatus.CANCELLED,
    });

    const res = await service.cancelSubscription('cust-1', 'sub-1');
    expect(res.status).toBe(RefillSubscriptionStatus.CANCELLED);
    expect(mockScheduler.cancelScheduledRemindersForSubscription).toHaveBeenCalledWith('sub-1');
  });

  it('5. Duplicate active subscription for same medicine is prevented', async () => {
    mockPrisma.refillEstimate.findUnique.mockResolvedValue({
      id: 'est-1',
      customerId: 'cust-1',
      medicineId: 'med-1',
      familyMemberId: null,
      eligibilityStatus: RefillEligibilityStatus.ELIGIBLE,
      medicine: { name: 'Metformin 500mg' },
    });
    mockPrisma.refillSubscription.findFirst.mockResolvedValue({
      id: 'sub-existing',
      status: RefillSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.createSubscription('cust-1', {
        refillEstimateId: 'est-1',
        reminderDaysBefore: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('6. Customer cannot modify another customer subscription', async () => {
    mockPrisma.refillSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-other',
      status: RefillSubscriptionStatus.ACTIVE,
    });

    await expect(service.pauseSubscription('cust-1', 'sub-1')).rejects.toThrow(NotFoundException);
  });

  it('7. Cannot create subscription for calculation-unavailable estimate', async () => {
    mockPrisma.refillEstimate.findUnique.mockResolvedValue({
      id: 'est-2',
      customerId: 'cust-1',
      medicineId: 'med-1',
      eligibilityStatus: RefillEligibilityStatus.CALCULATION_UNAVAILABLE,
      ineligibilityReason: 'Liquid syrup has variable consumption.',
    });

    await expect(
      service.createSubscription('cust-1', {
        refillEstimateId: 'est-2',
        reminderDaysBefore: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('8. One-tap reorder pre-fills standard cart without placing order directly', async () => {
    mockPrisma.refillSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      customerId: 'cust-1',
      refillEstimate: {
        dispensedQuantity: 60,
        medicine: {
          id: 'med-1',
          name: 'Metformin 500mg',
          status: 'ACTIVE',
          schedule: 'SCHEDULE_H',
        },
      },
    });

    const res = await service.initiateReorder('cust-1', 'sub-1');
    expect(res.success).toBe(true);
    expect(res.cartId).toBe('cart-1');
    expect(res.quantity).toBe(60);
    expect(mockCart.addItem).toHaveBeenCalledWith('cust-1', {
      medicineId: 'med-1',
      quantity: 60,
    });
  });
});
