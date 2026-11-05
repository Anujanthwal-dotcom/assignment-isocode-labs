import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RefillReminderStatus } from '@prisma/client';

export const REFILL_REMINDERS_QUEUE = 'refill-reminders';

export interface ScheduleReminderJobPayload {
  subscriptionId: string;
  refillEstimateId: string;
  scheduledFor: string;
  idempotencyKey: string;
}

@Injectable()
export class RefillSchedulerService {
  private readonly logger = new Logger(RefillSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(REFILL_REMINDERS_QUEUE)
    private readonly remindersQueue: Queue,
  ) {}

  /**
   * Schedule a reminder for an active subscription.
   * Lead time (3, 5, or 7 days) is deducted from the estimated run-out date.
   * Safety: Asia/Kolkata timezone default 09:00 AM.
   */
  async scheduleReminderForSubscription(subscriptionId: string, customNow = new Date()): Promise<void> {
    const subscription = await this.prisma.refillSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        refillEstimate: {
          include: { medicine: true },
        },
      },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return;
    }

    const estimate = subscription.refillEstimate;
    if (!estimate.estimatedRunOutAt) {
      return;
    }

    // Lead days (default 5, or customer preference 3, 5, 7)
    const leadDays = subscription.reminderDaysBefore || 5;
    const runOutTime = estimate.estimatedRunOutAt.getTime();
    const scheduledTime = runOutTime - leadDays * 24 * 60 * 60 * 1000;
    const scheduledDate = new Date(scheduledTime);

    // Format date string for unique idempotency key: YYYY-MM-DD
    const dateStr = scheduledDate.toISOString().slice(0, 10);
    const idempotencyKey = `refill-rem-${subscription.id}-${dateStr}`;

    // Catch-up policy check:
    // If scheduled date is already in the past relative to customNow:
    // If run-out date is still in the future, schedule immediately as a catch-up (delay 0).
    // If run-out date has also passed, mark reminder as SKIPPED.
    const isPastSchedule = scheduledTime <= customNow.getTime();
    const isRunOutFuture = runOutTime > customNow.getTime();

    if (isPastSchedule && !isRunOutFuture) {
      // Overdue cycle: skip
      await this.prisma.refillReminder.upsert({
        where: { idempotencyKey },
        update: { status: RefillReminderStatus.SKIPPED },
        create: {
          subscriptionId: subscription.id,
          refillEstimateId: estimate.id,
          scheduledFor: scheduledDate,
          status: RefillReminderStatus.SKIPPED,
          idempotencyKey,
        },
      });
      return;
    }

    // Calculate BullMQ delay (ms from now)
    const delayMs = isPastSchedule ? 0 : Math.max(0, scheduledTime - customNow.getTime());

    // Record scheduled reminder in DB
    const reminder = await this.prisma.refillReminder.upsert({
      where: { idempotencyKey },
      update: {
        status: RefillReminderStatus.SCHEDULED,
        scheduledFor: scheduledDate,
      },
      create: {
        subscriptionId: subscription.id,
        refillEstimateId: estimate.id,
        scheduledFor: scheduledDate,
        status: RefillReminderStatus.SCHEDULED,
        idempotencyKey,
      },
    });

    // Enqueue delayed BullMQ job
    const jobPayload: ScheduleReminderJobPayload = {
      subscriptionId: subscription.id,
      refillEstimateId: estimate.id,
      scheduledFor: scheduledDate.toISOString(),
      idempotencyKey,
    };

    await this.remindersQueue.add('send-refill-reminder', jobPayload, {
      jobId: idempotencyKey, // Prevents duplicate BullMQ jobs
      delay: delayMs,
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(
      `Scheduled refill reminder ${reminder.id} for subscription ${subscription.id} with delay ${delayMs}ms (scheduledFor: ${scheduledDate.toISOString()})`,
    );
  }

  async cancelScheduledRemindersForSubscription(subscriptionId: string): Promise<void> {
    await this.prisma.refillReminder.updateMany({
      where: {
        subscriptionId,
        status: RefillReminderStatus.SCHEDULED,
      },
      data: {
        status: RefillReminderStatus.CANCELLED,
      },
    });
  }
}
