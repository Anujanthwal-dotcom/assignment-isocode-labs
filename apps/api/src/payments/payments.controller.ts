import { Controller, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MockPaymentService } from './mock-payment.service';
import { MockPaymentDto } from './payments.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Payments')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/orders')
export class PaymentsController {
  constructor(private readonly mockPaymentService: MockPaymentService) {}

  @Post(':id/mock-payment')
  @ApiOperation({ summary: 'Simulate mock UPI payment (SUCCESS or FAILURE)' })
  @ApiResponse({ status: 200, description: 'Mock payment processed' })
  @ApiResponse({ status: 400, description: 'Order not UPI or invalid payment status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async mockPayment(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
    @Body() dto: MockPaymentDto,
  ) {
    return this.mockPaymentService.processMockPayment(customerUserId, id, dto);
  }
}
