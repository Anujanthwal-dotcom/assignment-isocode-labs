import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { RefillsService } from './refills.service';
import {
  createRefillSubscriptionSchema,
  updateRefillSubscriptionSchema,
} from '@pharmacy/validation';

@Controller('customer/refills')
@Roles(UserRole.CUSTOMER)
export class CustomerRefillsController {
  constructor(private readonly refillsService: RefillsService) {}

  @Get()
  async getRefillEstimates(@CurrentUser('id') customerUserId: string) {
    return this.refillsService.getCustomerRefillEstimates(customerUserId);
  }

  @Get('subscriptions')
  async getSubscriptions(@CurrentUser('id') customerUserId: string) {
    return this.refillsService.getCustomerSubscriptions(customerUserId);
  }

  @Post('subscriptions')
  async createSubscription(
    @CurrentUser('id') customerUserId: string,
    @Body() body: unknown,
  ) {
    const validated = createRefillSubscriptionSchema.parse(body);
    return this.refillsService.createSubscription(customerUserId, validated);
  }

  @Patch('subscriptions/:subscriptionId')
  async updateSubscription(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() body: unknown,
  ) {
    const validated = updateRefillSubscriptionSchema.parse(body);
    return this.refillsService.updateSubscription(customerUserId, subscriptionId, validated);
  }

  @Post('subscriptions/:subscriptionId/pause')
  async pauseSubscription(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.refillsService.pauseSubscription(customerUserId, subscriptionId);
  }

  @Post('subscriptions/:subscriptionId/resume')
  async resumeSubscription(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.refillsService.resumeSubscription(customerUserId, subscriptionId);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  async cancelSubscription(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.refillsService.cancelSubscription(customerUserId, subscriptionId);
  }

  @Get('subscriptions/:subscriptionId/reminders')
  async getSubscriptionReminders(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.refillsService.getSubscriptionReminders(customerUserId, subscriptionId);
  }

  @Post('subscriptions/:subscriptionId/reorder')
  async reorder(
    @CurrentUser('id') customerUserId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.refillsService.initiateReorder(customerUserId, subscriptionId);
  }
}
