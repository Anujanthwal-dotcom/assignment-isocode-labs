import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsInt,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MedicineSchedule, MedicineStatus } from '@prisma/client';

export class CreateMedicineDto {
  @ApiProperty({ example: 'MED-MET-500-001', description: 'Unique product SKU' })
  @IsNotEmpty({ message: 'SKU is required' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: 'Metformin 500 mg', description: 'Medicine brand or commercial name' })
  @IsNotEmpty({ message: 'Medicine name is required' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Example Brand' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ example: 'Metformin' })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiPropertyOptional({ example: 'Demo Manufacturer' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: '500 mg' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional()
  @IsString()
  dosageForm?: string;

  @ApiPropertyOptional({ example: '15 tablets' })
  @IsOptional()
  @IsString()
  packSize?: string;

  @ApiPropertyOptional({
    enum: MedicineSchedule,
    default: MedicineSchedule.UNKNOWN,
    description: 'Statutory drug schedule',
  })
  @IsOptional()
  @IsEnum(MedicineSchedule, { message: 'Schedule must be a valid MedicineSchedule enum value' })
  schedule?: MedicineSchedule;

  @ApiProperty({ example: 30.0, description: 'Maximum Retail Price in INR (greater than 0)' })
  @IsNotEmpty({ message: 'MRP is required' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'MRP must be a valid number with at most 2 decimal places' },
  )
  @Min(0.01, { message: 'MRP must be greater than zero' })
  mrp!: number;
}

export class UpdateMedicineDto {
  @ApiPropertyOptional({ example: 'Metformin 500 mg' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Example Brand' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ example: 'Metformin' })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiPropertyOptional({ example: 'Demo Manufacturer' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: '500 mg' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional()
  @IsString()
  dosageForm?: string;

  @ApiPropertyOptional({ example: '15 tablets' })
  @IsOptional()
  @IsString()
  packSize?: string;

  @ApiPropertyOptional({ enum: MedicineSchedule })
  @IsOptional()
  @IsEnum(MedicineSchedule, { message: 'Schedule must be a valid MedicineSchedule enum value' })
  schedule?: MedicineSchedule;

  @ApiPropertyOptional({ example: 35.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'MRP must be a valid number with at most 2 decimal places' },
  )
  @Min(0.01, { message: 'MRP must be greater than zero' })
  mrp?: number;
}

export class UpdateMedicineStatusDto {
  @ApiProperty({ enum: MedicineStatus, example: MedicineStatus.INACTIVE })
  @IsNotEmpty()
  @IsEnum(MedicineStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  status!: MedicineStatus;
}

export class ListMedicinesQueryDto {
  @ApiPropertyOptional({ description: 'Search name, SKU, generic name, or brand name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MedicineStatus })
  @IsOptional()
  @IsEnum(MedicineStatus)
  status?: MedicineStatus;

  @ApiPropertyOptional({ enum: MedicineSchedule })
  @IsOptional()
  @IsEnum(MedicineSchedule)
  schedule?: MedicineSchedule;

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

  @ApiPropertyOptional({ enum: ['name', 'sku', 'mrp', 'createdAt'], default: 'name' })
  @IsOptional()
  @IsIn(['name', 'sku', 'mrp', 'createdAt'])
  sortBy: string = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
