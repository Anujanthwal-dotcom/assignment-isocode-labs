import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  REFILL_REMINDERS_QUEUE,
  ScheduleReminderJobPayload,
} from './refill-scheduler.service';
import {
  RefillReminderStatus,
  RefillSubscriptionStatus,
  NotificationType,
} from '@prisma/client';

@Processor(REFILL_REMINDERS_QUEUE)
export class RefillReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(RefillReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<ScheduleReminderJobPayload>): Promise<void> {
    const { subscriptionId, refillEstimateId, idempotencyKey } = job.data;
    this.logger.log(`Processing refill reminder job: ${idempotencyKey}`);

    // 1. Fetch reminder and subscription
    const reminder = await this.prisma.refillReminder.findUnique({
      where: { idempotencyKey },
      include: {
        subscription: {
          include: {
            refillEstimate: {
              include: { medicine: true },
            },
          },
        },
      },
    });

    if (!reminder) {
      this.logger.warn(`Reminder record with key ${idempotencyKey} not found.`);
      return;
    }

    // 2. Idempotency check: if already SENT or SKIPPED or CANCELLED, do not resend
    if (reminder.status === RefillReminderStatus.SENT) {
      this.logger.log(`Reminder ${idempotencyKey} already sent.`);
      return;
    }

    if (reminder.status === RefillReminderStatus.CANCELLED || reminder.status === RefillReminderStatus.SKIPPED) {
      this.logger.log(`Reminder ${idempotencyKey} was cancelled/skipped.`);
      return;
    }

    const sub = reminder.subscription;
    // 3. Subscription state check
    if (!sub || sub.status !== RefillSubscriptionStatus.ACTIVE) {
      this.logger.log(`Subscription ${subscriptionId} is not ACTIVE (status: ${sub?.status}). Skipping.`);
      await this.prisma.refillReminder.update({
        where: { id: reminder.id },
        data: { status: RefillReminderStatus.CANCELLED },
      });
      return;
    }

    // 4. Check if estimate has been superseded by a newer dispensing event
    if (sub.refillEstimateId !== refillEstimateId) {
      this.logger.log(`Refill estimate was superseded. Skipping reminder.`);
      await this.prisma.refillReminder.update({
        where: { id: reminder.id },
        data: { status: RefillReminderStatus.SKIPPED },
      });
      return;
    }

    // 5. Medicine active check
    const med = sub.refillEstimate.medicine;
    if (med.status !== 'ACTIVE') {
      this.logger.log(`Medicine ${med.name} is no longer ACTIVE. Skipping reminder.`);
      await this.prisma.refillReminder.update({
        where: { id: reminder.id },
        data: { status: RefillReminderStatus.SKIPPED },
      });
      return;
    }

    // 6. Send in-app notification
    const daysBefore = sub.reminderDaysBefore || 5;
    const notification = await this.notificationsService.send({
      customerId: sub.customerId,
      type: NotificationType.REFILL_REMINDER_DUE,
      title: 'Your medicine may be running low',
      message: `Your ${med.name} supply is estimated to run low in about ${daysBefore} days. Review your refill when convenient.`,
      resourceId: sub.id,
    });

    const now = new Date();
    await this.prisma.refillReminder.update({
      where: { id: reminder.id },
      data: {
        status: RefillReminderStatus.SENT,
        sentAt: now,
        notificationId: notification.id,
      },
    });

    await this.auditService.record({
      actorUserId: '00000000-0000-0000-0000-000000000000', // System worker actor
      action: 'REFILL_REMINDER_SENT',
      resourceType: 'RefillReminder',
      resourceId: reminder.id,
      metadata: {
        subscriptionId: sub.id,
        customerId: sub.customerId,
        medicineId: med.id,
        medicineName: med.name,
      },
    });

    this.logger.log(`Successfully sent refill reminder ${reminder.id} to customer ${sub.customerId}`);
  }
}
