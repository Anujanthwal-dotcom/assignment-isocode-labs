import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class RequestPrescriptionExtractionDto {
  @ApiPropertyOptional({
    description:
      'Optional fixture hint for deterministic testing in mock mode (e.g. "readable", "multi", "ambiguous", "unmatched", "unreadable", "failure")',
    example: 'readable',
  })
  @IsOptional()
  @IsString()
  @IsIn(['readable', 'multi', 'ambiguous', 'unmatched', 'unreadable', 'failure'])
  mockFixture?: string;
}

export class RetryPrescriptionExtractionDto {
  @ApiPropertyOptional({
    description: 'Optional fixture hint for retry in mock mode',
  })
  @IsOptional()
  @IsString()
  mockFixture?: string;
}
