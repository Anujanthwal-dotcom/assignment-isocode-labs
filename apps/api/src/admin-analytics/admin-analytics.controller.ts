import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminAnalyticsService } from './admin-analytics.service';
import { analyticsQuerySchema } from '@pharmacy/validation';

@Controller('admin/analytics')
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('overview')
  async getOverview(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getOverview(
      validated.period,
      validated.from,
      validated.to,
      validated.storeId,
    );
  }

  @Get('orders/by-store')
  async getOrdersByStore(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getOrdersByStore(validated.period, validated.from, validated.to);
  }

  @Get('orders/timeline')
  async getOrdersTimeline(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getOrdersTimeline(
      validated.period,
      validated.from,
      validated.to,
      validated.storeId,
    );
  }

  @Get('verification')
  async getVerificationAnalytics(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getVerificationAnalytics(
      validated.period,
      validated.from,
      validated.to,
      validated.storeId,
    );
  }

  @Get('fulfilment')
  async getFulfilmentAnalytics(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getFulfilmentAnalytics(
      validated.period,
      validated.from,
      validated.to,
      validated.storeId,
    );
  }

  @Get('refills')
  async getRefillAnalytics(@Query() query: Record<string, string>) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getRefillAnalytics(validated.period, validated.from, validated.to);
  }

  @Get('stores/:storeId')
  async getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsQuerySchema.parse(query);
    return this.analyticsService.getStoreAnalytics(
      storeId,
      validated.period,
      validated.from,
      validated.to,
    );
  }
}
