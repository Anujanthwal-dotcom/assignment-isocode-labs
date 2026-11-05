import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionReviewStatus } from '@prisma/client';

export class UpdateOrderItemReviewDto {
  @ApiPropertyOptional({ description: 'Catalogue medicine ID if changing match' })
  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @ApiPropertyOptional({ description: 'Corrected medicine name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reviewedMedicineName?: string;

  @ApiPropertyOptional({ description: 'Corrected strength (e.g. 500 mg)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedStrength?: string;

  @ApiPropertyOptional({ description: 'Corrected dosage form (e.g. Tablet)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedDosageForm?: string;

  @ApiPropertyOptional({ description: 'Dosage instructions (e.g. 1 tablet after meals)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewedDosageInstructions?: string;

  @ApiPropertyOptional({ description: 'Frequency (e.g. Twice daily)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedFrequency?: string;

  @ApiPropertyOptional({ description: 'Duration (e.g. 5 days)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedDuration?: string;

  @ApiPropertyOptional({ description: 'Reviewed quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  reviewedQuantity?: number;

  @ApiPropertyOptional({ description: 'Pharmacist-verified units consumed per administration (e.g. 1)' })
  @IsOptional()
  unitsPerAdministration?: number;

  @ApiPropertyOptional({ description: 'Pharmacist-verified administrations per day (e.g. 2)' })
  @IsOptional()
  administrationsPerDay?: number;

  @ApiPropertyOptional({ description: 'Pharmacist-verified dosage unit (e.g. TABLET)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  verifiedDosageUnit?: string;

  @ApiPropertyOptional({ description: 'Reason for correction or notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionReason?: string;
}

export class ApproveOrderItemDto {
  @ApiPropertyOptional({ description: 'Patient name for Schedule H1 register' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  patientName?: string;

  @ApiPropertyOptional({ description: 'Prescriber doctor name for Schedule H1 register' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  prescriberName?: string;

  @ApiPropertyOptional({ description: 'Prescriber clinic/registration details for Schedule H1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  prescriberDetails?: string;
}

export class RejectOrderItemDto {
  @ApiProperty({ description: 'Mandatory reason for rejecting item' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class BlockOrderItemDto {
  @ApiProperty({ description: 'Mandatory reason for blocking item under compliance policy' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ProposeAlternativeDto {
  @ApiProperty({ description: 'Catalogue medicine ID of proposed generic alternative' })
  @IsUUID()
  proposedMedicineId!: string;

  @ApiProperty({ description: 'Mandatory explanation for proposing generic alternative' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class RejectPrescriptionDto {
  @ApiProperty({ description: 'Mandatory reason for rejecting entire prescription' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class RequestReuploadDto {
  @ApiProperty({ description: 'Mandatory reason explaining why re-upload is required' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class PharmacistQueueQueryDto {
  @ApiPropertyOptional({ enum: PrescriptionReviewStatus })
  @IsOptional()
  @IsEnum(PrescriptionReviewStatus)
  status?: PrescriptionReviewStatus;

  @ApiPropertyOptional({ description: 'Search by customer name, order number, or medicine' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
