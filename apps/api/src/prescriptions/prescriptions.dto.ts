import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus, OrderPaymentMethod } from '@prisma/client';

export class UploadPrescriptionDto {
  @ApiPropertyOptional({
    description: 'Optional UUID of the family member this prescription belongs to',
  })
  @IsOptional()
  @IsUUID()
  familyMemberId?: string;
}

export class ListPrescriptionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by family member UUID' })
  @IsOptional()
  @IsUUID()
  familyMemberId?: string;

  @ApiPropertyOptional({ enum: PrescriptionStatus })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

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

export class AcceptPrescriptionQuoteAndPayDto {
  @ApiProperty({ description: 'Quotation UUID' })
  @IsUUID()
  quoteId!: string;

  @ApiProperty({ description: 'Customer delivery address UUID' })
  @IsUUID()
  addressId!: string;

  @ApiProperty({ enum: OrderPaymentMethod, description: 'Payment method' })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @ApiPropertyOptional({ description: 'Optional instructions or note' })
  @IsOptional()
  @IsString()
  customerNote?: string;
}

