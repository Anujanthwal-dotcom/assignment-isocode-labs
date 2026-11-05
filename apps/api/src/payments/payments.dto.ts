import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MockPaymentDto {
  @ApiProperty({ enum: ['SUCCESS', 'FAILURE'], example: 'SUCCESS' })
  @IsIn(['SUCCESS', 'FAILURE'])
  result!: 'SUCCESS' | 'FAILURE';
}
