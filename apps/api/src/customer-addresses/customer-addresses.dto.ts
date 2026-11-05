import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerAddressDto {
  @ApiProperty({ description: 'Label for the address', example: 'Home' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ description: 'Recipient name', example: 'Debasish Ghosh' })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiProperty({ description: 'Recipient contact phone number', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Address line 1', example: 'Flat 4B, Greenfield Heights' })
  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Action Area 1' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Nearby landmark', example: 'Near Axis Mall' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ description: 'City', example: 'Kolkata' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ description: 'State', example: 'West Bengal' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ description: '6-digit Indian PIN code', example: '700156' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiPropertyOptional({ description: 'Mark as default address', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto {
  @ApiPropertyOptional({ description: 'Label for the address', example: 'Home' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiPropertyOptional({ description: 'Recipient name', example: 'Debasish Ghosh' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Recipient contact phone number', example: '9876543210' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address line 1', example: 'Flat 4B, Greenfield Heights' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Action Area 1' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Nearby landmark', example: 'Near Axis Mall' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Kolkata' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'West Bengal' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  state?: string;

  @ApiPropertyOptional({ description: '6-digit Indian PIN code', example: '700156' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Mark as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
