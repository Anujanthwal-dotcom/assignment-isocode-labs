import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsIn,
  IsUUID,
  NotEquals,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryLocationType, InventoryMovementType } from '@prisma/client';

export class InventoryListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by medicine name or SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store UUID' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Filter by warehouse UUID' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'],
    description: 'Filter by stock availability status',
  })
  @IsOptional()
  @IsIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'])
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ['quantity', 'updatedAt', 'medicineName'], default: 'updatedAt' })
  @IsOptional()
  @IsIn(['quantity', 'updatedAt', 'medicineName'])
  sortBy: string = 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class InventoryAdjustmentDto {
  @ApiProperty({ description: 'UUID of the target medicine' })
  @IsNotEmpty({ message: 'Medicine ID is required' })
  @IsUUID()
  medicineId!: string;

  @ApiProperty({ enum: InventoryLocationType, description: 'STORE or WAREHOUSE' })
  @IsNotEmpty({ message: 'Location type is required' })
  @IsEnum(InventoryLocationType)
  locationType!: InventoryLocationType;

  @ApiProperty({ description: 'UUID of the target Store or Warehouse' })
  @IsNotEmpty({ message: 'Location ID is required' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({
    example: -5,
    description: 'Signed quantity change (must not be 0)',
  })
  @IsNotEmpty({ message: 'Quantity change is required' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity change must be an integer' })
  @NotEquals(0, { message: 'Quantity change cannot be zero' })
  quantityChange!: number;

  @ApiProperty({
    example: 'Damaged stock during transit',
    description: 'Mandatory reason for manual adjustment',
  })
  @IsNotEmpty({ message: 'Adjustment reason is mandatory' })
  @IsString()
  reason!: string;
}

export class InventoryMovementQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: InventoryMovementType })
  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
