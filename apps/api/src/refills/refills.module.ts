import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartModule } from '../cart/cart.module';
import { RefillCalculationService } from './refill-calculation.service';
import { RefillSchedulerService, REFILL_REMINDERS_QUEUE } from './refill-scheduler.service';
import { RefillReminderProcessor } from './refill-reminder.processor';
import { RefillsService } from './refills.service';
import { CustomerRefillsController } from './customer-refills.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    CartModule,
    BullModule.registerQueue({
      name: REFILL_REMINDERS_QUEUE,
    }),
  ],
  controllers: [CustomerRefillsController],
  providers: [
    RefillCalculationService,
    RefillSchedulerService,
    RefillReminderProcessor,
    RefillsService,
  ],
  exports: [RefillCalculationService, RefillSchedulerService, RefillsService],
})
export class RefillsModule {}
