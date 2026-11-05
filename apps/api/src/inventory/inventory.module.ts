import { Module } from '@nestjs/common';
import { InventoryQueryService } from './inventory-query.service';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { InventoryMovementService } from './inventory-movement.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [InventoryQueryService, InventoryAdjustmentService, InventoryMovementService],
  exports: [InventoryQueryService, InventoryAdjustmentService, InventoryMovementService],
})
export class InventoryModule {}
