import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsEmail, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    description: '10-digit Indian mobile number',
    example: '9876543210',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^(?:\+91|0)?[6-9]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: '10-digit Indian mobile number',
    example: '9876543210',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^(?:\+91|0)?[6-9]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone!: string;

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
