import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface SendInAppNotificationParams {
  customerId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(params: SendInAppNotificationParams) {
    this.logger.log(`[InAppNotification] To customer ${params.customerId} - ${params.title}`);
    return this.prisma.customerNotification.create({
      data: {
        customerId: params.customerId,
        type: params.type,
        title: params.title,
        message: params.message,
        resourceId: params.resourceId || null,
      },
    });
  }

  async getCustomerNotifications(customerId: string) {
    return this.prisma.customerNotification.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(customerId: string) {
    const count = await this.prisma.customerNotification.count({
      where: { customerId, isRead: false },
    });
    return { count };
  }

  async markAsRead(customerId: string, notificationId: string) {
    return this.prisma.customerNotification.updateMany({
      where: { id: notificationId, customerId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(customerId: string) {
    return this.prisma.customerNotification.updateMany({
      where: { customerId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
