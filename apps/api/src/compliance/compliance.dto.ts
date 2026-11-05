import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Matches,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MedicineSchedule,
  ComplianceRuleSetStatus,
  CompliancePolicyAction,
} from '@prisma/client';

export class ComplianceRuleItemDto {
  @ApiProperty({ enum: MedicineSchedule })
  @IsEnum(MedicineSchedule)
  medicineSchedule!: MedicineSchedule;

  @ApiProperty({ enum: CompliancePolicyAction })
  @IsEnum(CompliancePolicyAction)
  policyAction!: CompliancePolicyAction;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresPharmacistApproval?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresH1Register?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hardBlocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateComplianceRuleSetDto {
  @ApiProperty({ example: '1.1.0' })
  @IsString()
  @Matches(/^v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/, {
    message: 'Version must be semver formatted (e.g. 1.0.0)',
  })
  version!: string;

  @ApiProperty({ example: 'Updated Monsoon Schedule Compliance Policy' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Updated compliance policies for strict H1 tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: [ComplianceRuleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplianceRuleItemDto)
  rules?: ComplianceRuleItemDto[];
}

export class UpdateComplianceRuleDto {
  @ApiPropertyOptional({ enum: CompliancePolicyAction })
  @IsOptional()
  @IsEnum(CompliancePolicyAction)
  policyAction?: CompliancePolicyAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPharmacistApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresH1Register?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hardBlocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ActivateComplianceRuleSetDto {
  @ApiProperty({
    description: 'Mandatory reason for activating this compliance rule set version',
    example: 'Annual regulatory review update for Schedule H1 substances',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
