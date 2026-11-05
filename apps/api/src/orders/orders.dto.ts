import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderPaymentMethod, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'UUID of the family member this order is for (or null for self)',
  })
  @IsOptional()
  @IsUUID()
  familyMemberId?: string | null;

  @ApiProperty({ description: 'UUID of the uploaded prescription' })
  @IsUUID()
  prescriptionId!: string;

  @ApiProperty({ description: 'UUID of the saved delivery address' })
  @IsUUID()
  addressId!: string;

  @ApiProperty({ enum: OrderPaymentMethod, example: OrderPaymentMethod.UPI })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @ApiPropertyOptional({ description: 'Optional delivery or customer note', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Search by human-readable order number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class RespondAlternativeDto {
  @ApiProperty({ enum: ['ACCEPT', 'DECLINE'] })
  @IsEnum(['ACCEPT', 'DECLINE'])
  action!: 'ACCEPT' | 'DECLINE';

  @ApiPropertyOptional({ description: 'Optional feedback or note from customer', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
