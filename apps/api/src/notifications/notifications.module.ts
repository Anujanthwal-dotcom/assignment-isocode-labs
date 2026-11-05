import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { CustomerNotificationsController } from './customer-notifications.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
