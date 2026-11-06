import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMemberRelationship } from '@prisma/client';

export class CreateFamilyMemberDto {
  @ApiProperty({ description: 'Full name of the family member', example: 'Maya Ghosh' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ enum: FamilyMemberRelationship, example: FamilyMemberRelationship.MOTHER })
  @IsEnum(FamilyMemberRelationship)
  relationship!: FamilyMemberRelationship;

  @ApiPropertyOptional({
    description: 'Optional date of birth (YYYY-MM-DD)',
    example: '1965-04-12',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class UpdateFamilyMemberDto {
  @ApiPropertyOptional({ description: 'Full name of the family member', example: 'Maya Ghosh' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({ enum: FamilyMemberRelationship, example: FamilyMemberRelationship.MOTHER })
  @IsOptional()
  @IsEnum(FamilyMemberRelationship)
  relationship?: FamilyMemberRelationship;

  @ApiPropertyOptional({
    description: 'Optional date of birth (YYYY-MM-DD)',
    example: '1965-04-12',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
