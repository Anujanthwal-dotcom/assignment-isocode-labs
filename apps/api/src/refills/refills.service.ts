import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RefillCalculationService } from './refill-calculation.service';
import { RefillSchedulerService } from './refill-scheduler.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CartService } from '../cart/cart.service';
import {
  RefillEligibilityStatus,
  RefillSubscriptionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

export interface CreateSubscriptionDto {
  refillEstimateId: string;
  reminderDaysBefore?: number;
  preferredNotificationChannel?: string;
}

export interface UpdateSubscriptionDto {
  reminderDaysBefore?: number;
  preferredNotificationChannel?: string;
}

@Injectable()
export class RefillsService {
  private readonly logger = new Logger(RefillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly calculationService: RefillCalculationService,
    private readonly schedulerService: RefillSchedulerService,
    private readonly notificationsService: NotificationsService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Generates RefillEstimates for all approved items of an order that has just been handed over.
   * Safety invariant: Must be called upon OrderHandover / HANDED_OVER, never prior.
   */
  async generateEstimatesForHandedOverOrder(orderId: string, dispensedAt: Date) {
    this.logger.log(
      `Generating refill estimates for handed-over order ${orderId} at ${dispensedAt.toISOString()}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            medicine: true,
            reviews: {
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    const createdEstimates: any[] = [];

    for (const item of order.items) {
      // Only approved items with valid pharmacist review are eligible
      const review = item.reviews[0];

      let calculationResult;
      if (
        !review ||
        !review.verifiedDosageConfirmed ||
        !review.unitsPerAdministration ||
        !review.administrationsPerDay
      ) {
        // Dosage was not confirmed by pharmacist
        calculationResult = {
          eligibilityStatus: 'AWAITING_VERIFIED_DOSAGE' as const,
          ineligibilityReason:
            'Pharmacist has not confirmed structured dosage for this dispensed item.',
          calculationInputs: {
            orderItemId: item.id,
            medicineId: item.medicineId,
            dispensedQuantity: item.quantity,
          },
          calculationVersion: 1,
        };
      } else {
        calculationResult = this.calculationService.calculate({
          dispensedQuantity: item.quantity,
          unitsPerAdministration: Number(review.unitsPerAdministration),
          administrationsPerDay: Number(review.administrationsPerDay),
          dosageUnit: review.verifiedDosageUnit || 'TABLET',
          dosageForm: review.reviewedDosageForm || item.medicine.dosageForm,
          dispensedAt,
          isPrnOrVariable: Boolean(
            review.reviewedDosageInstructions?.toLowerCase().includes('prn') ||
            review.reviewedDosageInstructions?.toLowerCase().includes('as needed') ||
            review.reviewedFrequency?.toLowerCase().includes('prn'),
          ),
        });
      }

      const estimate = await this.prisma.refillEstimate.create({
        data: {
          orderItemId: item.id,
          customerId: order.customerUserId,
          familyMemberId: order.familyMemberId || null,
          medicineId: item.medicineId,
          dispensedQuantity: item.quantity,
          dailyConsumption: calculationResult.dailyConsumption
            ? new Prisma.Decimal(calculationResult.dailyConsumption)
            : null,
          estimatedSupplyDays: calculationResult.estimatedSupplyDays
            ? new Prisma.Decimal(calculationResult.estimatedSupplyDays)
            : null,
          dispensedAt,
          estimatedRunOutAt: calculationResult.estimatedRunOutAt || null,
          eligibilityStatus: calculationResult.eligibilityStatus as RefillEligibilityStatus,
          ineligibilityReason: calculationResult.ineligibilityReason || null,
          calculationInputs: calculationResult.calculationInputs as Prisma.InputJsonValue,
          calculationVersion: calculationResult.calculationVersion,
        },
      });

      createdEstimates.push(estimate);

      await this.auditService.record({
        actorUserId: order.customerUserId,
        action: 'REFILL_ESTIMATE_GENERATED',
        resourceType: 'RefillEstimate',
        resourceId: estimate.id,
        metadata: {
          orderId,
          orderItemId: item.id,
          medicineId: item.medicineId,
          eligibilityStatus: estimate.eligibilityStatus,
        },
      });

      // If customer has an active subscription for this medicine & family member, update subscription and reschedule!
      const activeSubscription = await this.prisma.refillSubscription.findFirst({
        where: {
          customerId: order.customerUserId,
          medicineId: item.medicineId,
          familyMemberId: order.familyMemberId || null,
          status: RefillSubscriptionStatus.ACTIVE,
        },
      });

      if (activeSubscription && estimate.eligibilityStatus === RefillEligibilityStatus.ELIGIBLE) {
        // Update subscription to point to latest estimate
        await this.prisma.refillSubscription.update({
          where: { id: activeSubscription.id },
          data: { refillEstimateId: estimate.id },
        });

        // Cancel older scheduled reminders and schedule new cycle
        await this.schedulerService.cancelScheduledRemindersForSubscription(activeSubscription.id);
        await this.schedulerService.scheduleReminderForSubscription(activeSubscription.id);
      }
    }

    return createdEstimates;
  }

  /**
   * Customer endpoints: List refill estimates.
   */
  async getCustomerRefillEstimates(customerId: string) {
    const estimates = await this.prisma.refillEstimate.findMany({
      where: { customerId },
      include: {
        medicine: true,
        familyMember: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'PAUSED'] } },
          take: 1,
        },
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const now = new Date();

    return estimates.map((est) => {
      let daysRemaining: number | null = null;
      if (est.estimatedRunOutAt) {
        const diffMs = est.estimatedRunOutAt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      }

      return {
        id: est.id,
        orderItemId: est.orderItemId,
        customerId: est.customerId,
        familyMemberId: est.familyMemberId,
        familyMemberName: est.familyMember?.fullName || null,
        medicineId: est.medicineId,
        medicineName: est.medicine.name,
        sku: est.medicine.sku,
        dispensedQuantity: est.dispensedQuantity,
        dailyConsumption: est.dailyConsumption ? Number(est.dailyConsumption) : null,
        estimatedSupplyDays: est.estimatedSupplyDays ? Number(est.estimatedSupplyDays) : null,
        dispensedAt: est.dispensedAt.toISOString(),
        estimatedRunOutAt: est.estimatedRunOutAt ? est.estimatedRunOutAt.toISOString() : null,
        daysRemaining,
        eligibilityStatus: est.eligibilityStatus,
        ineligibilityReason: est.ineligibilityReason,
        calculationVersion: est.calculationVersion,
        calculatedAt: est.calculatedAt.toISOString(),
        activeSubscription: est.subscriptions[0]
          ? {
              id: est.subscriptions[0].id,
              customerId: est.subscriptions[0].customerId,
              familyMemberId: est.subscriptions[0].familyMemberId,
              familyMemberName: est.familyMember?.fullName || null,
              medicineId: est.subscriptions[0].medicineId,
              medicineName: est.medicine.name,
              refillEstimateId: est.subscriptions[0].refillEstimateId,
              status: est.subscriptions[0].status,
              reminderDaysBefore: est.subscriptions[0].reminderDaysBefore,
              preferredNotificationChannel: est.subscriptions[0].preferredNotificationChannel,
              createdAt: est.subscriptions[0].createdAt.toISOString(),
              updatedAt: est.subscriptions[0].updatedAt.toISOString(),
              pausedAt: est.subscriptions[0].pausedAt?.toISOString() || null,
              cancelledAt: est.subscriptions[0].cancelledAt?.toISOString() || null,
              estimatedRunOutAt: est.estimatedRunOutAt ? est.estimatedRunOutAt.toISOString() : null,
              daysRemaining,
            }
          : null,
      };
    });
  }

  /**
   * Customer endpoints: List subscriptions.
   */
  async getCustomerSubscriptions(customerId: string) {
    const subscriptions = await this.prisma.refillSubscription.findMany({
      where: { customerId },
      include: {
        medicine: true,
        familyMember: true,
        refillEstimate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return subscriptions.map((sub) => {
      let daysRemaining: number | null = null;
      if (sub.refillEstimate.estimatedRunOutAt) {
        const diffMs = sub.refillEstimate.estimatedRunOutAt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      }

      return {
        id: sub.id,
        customerId: sub.customerId,
        familyMemberId: sub.familyMemberId,
        familyMemberName: sub.familyMember?.fullName || null,
        medicineId: sub.medicineId,
        medicineName: sub.medicine.name,
        refillEstimateId: sub.refillEstimateId,
        status: sub.status,
        reminderDaysBefore: sub.reminderDaysBefore,
        preferredNotificationChannel: sub.preferredNotificationChannel,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        pausedAt: sub.pausedAt?.toISOString() || null,
        cancelledAt: sub.cancelledAt?.toISOString() || null,
        estimatedRunOutAt: sub.refillEstimate.estimatedRunOutAt
          ? sub.refillEstimate.estimatedRunOutAt.toISOString()
          : null,
        daysRemaining,
      };
    });
  }

  /**
   * Explicit Customer Opt-In to Refill Reminders.
   */
  async createSubscription(customerId: string, dto: CreateSubscriptionDto) {
    const estimate = await this.prisma.refillEstimate.findUnique({
      where: { id: dto.refillEstimateId },
      include: { medicine: true },
    });

    if (!estimate || estimate.customerId !== customerId) {
      throw new NotFoundException('Refill estimate not found.');
    }

    if (estimate.eligibilityStatus !== RefillEligibilityStatus.ELIGIBLE) {
      throw new BadRequestException(
        `Cannot create refill subscription: ${estimate.ineligibilityReason || 'Dosage calculation unavailable.'}`,
      );
    }

    // Check for existing active subscription
    const existing = await this.prisma.refillSubscription.findFirst({
      where: {
        customerId,
        medicineId: estimate.medicineId,
        familyMemberId: estimate.familyMemberId,
        status: RefillSubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'An active refill subscription already exists for this medicine.',
      );
    }

    const leadDays = dto.reminderDaysBefore || 5;

    const subscription = await this.prisma.refillSubscription.create({
      data: {
        customerId,
        familyMemberId: estimate.familyMemberId,
        medicineId: estimate.medicineId,
        refillEstimateId: estimate.id,
        status: RefillSubscriptionStatus.ACTIVE,
        reminderDaysBefore: leadDays,
        preferredNotificationChannel: dto.preferredNotificationChannel || 'IN_APP',
      },
    });

    await this.auditService.record({
      actorUserId: customerId,
      action: 'REFILL_SUBSCRIPTION_CREATED',
      resourceType: 'RefillSubscription',
      resourceId: subscription.id,
      metadata: {
        medicineId: estimate.medicineId,
        reminderDaysBefore: leadDays,
      },
    });

    // Schedule reminder
    await this.schedulerService.scheduleReminderForSubscription(subscription.id);

    return subscription;
  }

  async pauseSubscription(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    if (sub.status !== RefillSubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused.');
    }

    const updated = await this.prisma.refillSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: RefillSubscriptionStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    await this.schedulerService.cancelScheduledRemindersForSubscription(subscriptionId);

    await this.notificationsService.send({
      customerId,
      type: NotificationType.REFILL_SUBSCRIPTION_PAUSED,
      title: 'Refill reminders paused',
      message: 'Your refill reminders have been paused. You can resume them at any time.',
      resourceId: subscriptionId,
    });

    await this.auditService.record({
      actorUserId: customerId,
      action: 'REFILL_SUBSCRIPTION_PAUSED',
      resourceType: 'RefillSubscription',
      resourceId: subscriptionId,
    });

    return updated;
  }

  async resumeSubscription(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    if (sub.status !== RefillSubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed.');
    }

    const updated = await this.prisma.refillSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: RefillSubscriptionStatus.ACTIVE,
        pausedAt: null,
      },
    });

    await this.schedulerService.scheduleReminderForSubscription(subscriptionId);

    await this.notificationsService.send({
      customerId,
      type: NotificationType.REFILL_SUBSCRIPTION_RESUMED,
      title: 'Refill reminders resumed',
      message: 'Your refill reminders have been resumed.',
      resourceId: subscriptionId,
    });

    await this.auditService.record({
      actorUserId: customerId,
      action: 'REFILL_SUBSCRIPTION_RESUMED',
      resourceType: 'RefillSubscription',
      resourceId: subscriptionId,
    });

    return updated;
  }

  async cancelSubscription(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    const updated = await this.prisma.refillSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: RefillSubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await this.schedulerService.cancelScheduledRemindersForSubscription(subscriptionId);

    await this.notificationsService.send({
      customerId,
      type: NotificationType.REFILL_SUBSCRIPTION_CANCELLED,
      title: 'Refill subscription cancelled',
      message: 'Your refill reminders have been cancelled.',
      resourceId: subscriptionId,
    });

    await this.auditService.record({
      actorUserId: customerId,
      action: 'REFILL_SUBSCRIPTION_CANCELLED',
      resourceType: 'RefillSubscription',
      resourceId: subscriptionId,
    });

    return updated;
  }

  async updateSubscription(customerId: string, subscriptionId: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    const updated = await this.prisma.refillSubscription.update({
      where: { id: subscriptionId },
      data: {
        reminderDaysBefore: dto.reminderDaysBefore,
        preferredNotificationChannel: dto.preferredNotificationChannel,
      },
    });

    if (dto.reminderDaysBefore && sub.status === RefillSubscriptionStatus.ACTIVE) {
      await this.schedulerService.cancelScheduledRemindersForSubscription(subscriptionId);
      await this.schedulerService.scheduleReminderForSubscription(subscriptionId);
    }

    return updated;
  }

  async getSubscriptionReminders(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    return this.prisma.refillReminder.findMany({
      where: { subscriptionId },
      orderBy: { scheduledFor: 'desc' },
    });
  }

  /**
   * One-Tap Reorder Action: Pre-fills standard customer cart.
   * Safety invariant: Does NOT place or pay for order directly. Normal checkout & review required.
   */
  async initiateReorder(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        refillEstimate: {
          include: { medicine: true },
        },
      },
    });

    if (!sub || sub.customerId !== customerId) {
      throw new NotFoundException('Subscription not found.');
    }

    const med = sub.refillEstimate.medicine;
    if (med.status !== 'ACTIVE') {
      throw new BadRequestException(`Medicine "${med.name}" is no longer active in the catalogue.`);
    }

    // Determine quantity to add: use previously dispensed quantity from estimate
    const quantity = sub.refillEstimate.dispensedQuantity || 1;

    // Add to customer's active cart via CartService
    const cart = await this.cartService.addItem(customerId, {
      medicineId: med.id,
      quantity,
    });

    await this.notificationsService.send({
      customerId,
      type: NotificationType.REFILL_ORDER_INITIATED,
      title: 'Refill added to cart',
      message: `${med.name} (${quantity} units) has been added to your cart. Please review prescription requirements and proceed to checkout.`,
      resourceId: cart.id,
    });

    await this.auditService.record({
      actorUserId: customerId,
      action: 'REFILL_ORDER_INITIATED',
      resourceType: 'Cart',
      resourceId: cart.id,
      metadata: {
        subscriptionId,
        medicineId: med.id,
        quantity,
      },
    });

    return {
      success: true,
      cartId: cart.id,
      medicineName: med.name,
      quantity,
      schedule: med.schedule,
      message: 'Item added to cart. Please proceed through checkout.',
    };
  }
}
