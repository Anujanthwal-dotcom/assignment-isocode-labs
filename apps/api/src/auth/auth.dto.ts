import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsEmail, Length, IsOptional, MinLength } from 'class-validator';

export class RequestOtpDto {
  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: '10-digit Indian mobile number (legacy)',
    example: '9876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class VerifyOtpDto {
  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: '10-digit Indian mobile number (legacy)',
    example: '9876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp!: string;
}

export class CustomerRegisterDto {
  @ApiProperty({
    description: 'Customer email address',
    example: 'newuser@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'Debasish Ghosh',
  })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Optional account password',
    example: 'SecurePassword123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'en',
    enum: ['en', 'hi', 'bn'],
  })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;
}

export class StaffLoginDto {
  @ApiProperty({
    description: 'Staff email address',
    example: 'pharmacist@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Staff password',
    example: 'DemoPassword123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;
}

export class CustomerLoginDto {
  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Customer password',
    example: 'DemoPassword123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;
}
