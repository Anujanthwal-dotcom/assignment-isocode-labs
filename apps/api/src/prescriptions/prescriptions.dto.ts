import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';

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
