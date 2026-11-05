import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryLocationType, InventoryImportStatus } from '@prisma/client';

export class CreateInventoryImportDto {
  @ApiProperty({ enum: InventoryLocationType, description: 'STORE or WAREHOUSE' })
  @IsNotEmpty({ message: 'locationType is required' })
  @IsEnum(InventoryLocationType, { message: 'locationType must be STORE or WAREHOUSE' })
  locationType!: InventoryLocationType;

  @ApiProperty({ description: 'UUID of target store or warehouse' })
  @IsNotEmpty({ message: 'locationId is required' })
  @IsUUID('all', { message: 'locationId must be a valid UUID' })
  locationId!: string;
}

export class ListInventoryImportsQueryDto {
  @ApiPropertyOptional({ enum: InventoryImportStatus })
  @IsOptional()
  @IsEnum(InventoryImportStatus)
  status?: InventoryImportStatus;

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
