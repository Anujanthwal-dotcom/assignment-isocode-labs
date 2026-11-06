import { Controller, Get, Post, Delete, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ReviewAssignmentService } from './review-assignment.service';
import { AssignOrderReviewDto } from './review-assignment.dto';

@ApiTags('Admin Review Assignments')
@ApiBearerAuth()
@Controller('admin')
export class ReviewAssignmentController {
  constructor(private readonly assignmentService: ReviewAssignmentService) {}

  @Get('review-assignments/unassigned')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List unassigned orders awaiting pharmacist review store assignment' })
  async getUnassignedOrders(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.assignmentService.getUnassignedOrders({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('review-assignments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List currently assigned review orders across stores' })
  async getAssignmentsOverview(
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentService.getAssignmentsOverview({
      storeId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('orders/:orderId/review-assignment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Assign or reassign an order to a physical store for pharmacist review',
  })
  async assignOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AssignOrderReviewDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.assignmentService.assignOrder(orderId, dto, adminUserId);
  }

  @Delete('orders/:orderId/review-assignment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove active review assignment from an order' })
  async unassignOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.assignmentService.unassignOrder(orderId, adminUserId);
  }
}
