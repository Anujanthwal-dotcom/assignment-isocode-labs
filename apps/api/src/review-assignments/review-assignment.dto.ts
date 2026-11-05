import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignOrderReviewDto {
  @ApiProperty({ description: 'UUID of the store to assign the order review to' })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ description: 'Reason for assignment or reassignment', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
