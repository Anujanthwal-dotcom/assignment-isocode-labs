import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryQueryService } from './inventory-query.service';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { InventoryMovementService } from './inventory-movement.service';
import {
  InventoryListQueryDto,
  InventoryAdjustmentDto,
  InventoryMovementQueryDto,
} from './inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly inventoryAdjustmentService: InventoryAdjustmentService,
    private readonly inventoryMovementService: InventoryMovementService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'List inventory stock with role-based restrictions' })
  @ApiResponse({ status: 200, description: 'List of inventory records' })
  @ApiResponse({ status: 403, description: 'Forbidden location access' })
  async listInventory(
    @Query() query: InventoryListQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.inventoryQueryService.listInventory(user, query);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Aggregated inventory summary metrics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Aggregated stock metrics' })
  async getSummary() {
    return this.inventoryQueryService.getSummary();
  }

  @Post('adjustments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually adjust stock for a store or warehouse (Admin only)' })
  @ApiResponse({ status: 201, description: 'Stock adjusted and movement recorded' })
  @ApiResponse({ status: 400, description: 'Negative resulting stock or invalid input' })
  async adjustStock(
    @Body() dto: InventoryAdjustmentDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.inventoryAdjustmentService.adjustStock(user, dto);
  }

  @Get('movements')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'List inventory movement history' })
  @ApiResponse({ status: 200, description: 'Audit log of stock movements' })
  @ApiResponse({ status: 403, description: 'Forbidden location access' })
  async listMovements(
    @Query() query: InventoryMovementQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.inventoryMovementService.listMovements(user, query);
  }
}
