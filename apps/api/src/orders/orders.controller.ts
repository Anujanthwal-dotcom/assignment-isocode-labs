import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, ListOrdersQueryDto, RespondAlternativeDto } from './orders.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Orders')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new medicine order (starts in PENDING_VERIFICATION)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Empty cart, inactive medicine, or invalid input' })
  async create(
    @CurrentUser('id') customerUserId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(customerUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customer orders with pagination and search' })
  @ApiResponse({ status: 200, description: 'Order list' })
  async list(
    @CurrentUser('id') customerUserId: string,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.listOrders(customerUserId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details with snapshots and payment status' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrder(customerUserId, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history timeline' })
  @ApiResponse({ status: 200, description: 'Status history' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async history(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderHistory(customerUserId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel eligible order in PENDING_VERIFICATION state' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order is not eligible for cancellation' })
  async cancel(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(customerUserId, id);
  }

  @Get(':id/verification')
  @ApiOperation({ summary: 'Get prescription verification progress, review decisions, and alternative proposals' })
  @ApiResponse({ status: 200, description: 'Verification progress' })
  async getVerification(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getVerificationStatus(customerUserId, id);
  }

  @Post(':id/items/:orderItemId/remove')
  @ApiOperation({ summary: 'Remove a rejected or blocked item from the order and recalculate total' })
  @ApiResponse({ status: 200, description: 'Item removed from order' })
  async removeItem(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.ordersService.removeItemFromOrder(customerUserId, id, orderItemId);
  }

  @Post(':id/alternatives/:alternativeId/respond')
  @ApiOperation({ summary: 'Accept or decline a proposed generic alternative' })
  @ApiResponse({ status: 200, description: 'Generic alternative responded to' })
  async respondAlternative(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
    @Param('alternativeId') alternativeId: string,
    @Body() dto: RespondAlternativeDto,
  ) {
    return this.ordersService.respondToAlternativeProposal(
      customerUserId,
      id,
      alternativeId,
      dto.action,
      dto.note,
    );
  }
}
