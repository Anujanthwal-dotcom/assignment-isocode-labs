import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'UUID of the medicine to add' })
  @IsUUID()
  medicineId!: string;

  @ApiProperty({ description: 'Quantity (1-100)', default: 1, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity (1-100)', minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}
