import { Controller, Get, Patch, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';

@Controller('customer/notifications')
@Roles(UserRole.CUSTOMER)
export class CustomerNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser('id') customerUserId: string) {
    return this.notificationsService.getCustomerNotifications(customerUserId);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') customerUserId: string) {
    return this.notificationsService.getUnreadCount(customerUserId);
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @CurrentUser('id') customerUserId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    await this.notificationsService.markAsRead(customerUserId, notificationId);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser('id') customerUserId: string) {
    await this.notificationsService.markAllAsRead(customerUserId);
    return { success: true };
  }
}
