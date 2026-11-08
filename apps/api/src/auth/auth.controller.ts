import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  StaffLoginDto,
  CustomerLoginDto,
  CustomerRegisterDto,
} from './auth.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProd = this.configService.get<string>('nodeEnv') === 'production';
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const commonCookieOptions = {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    // 15 minutes access token
    res.cookie('access_token', accessToken, {
      ...commonCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    // 7 days refresh token
    res.cookie('refresh_token', refreshToken, {
      ...commonCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    const commonCookieOptions = {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('access_token', commonCookieOptions);
    res.clearCookie('refresh_token', commonCookieOptions);
  }

  @Public()
  @Post('customer/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'Customer registered and authenticated successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async registerCustomer(
    @Body() dto: CustomerRegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.registerCustomer(
      dto,
      ipAddress,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Public()
  @Post('customer/initiate-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify customer email & password, then issue login OTP' })
  @ApiResponse({ status: 200, description: 'Credentials valid, OTP sent to email' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Account inactive or suspended' })
  async initiateCustomerLogin(
    @Body() dto: CustomerLoginDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.initiateCustomerLogin(dto.email, dto.password, ipAddress);
  }

  @Public()
  @Post('customer/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for customer login' })
  @ApiResponse({ status: 200, description: 'OTP requested successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (max 3 per 15 mins)' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    const identifier = dto.email || dto.phone;
    if (!identifier) {
      throw new BadRequestException('Please provide an email address.');
    }
    return this.authService.requestCustomerOtp(identifier);
  }

  @Public()
  @Post('customer/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and authenticate customer' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 403, description: 'Account inactive or suspended' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const identifier = dto.email || dto.phone;
    if (!identifier) {
      throw new BadRequestException('Please provide an email address.');
    }
    const { user, accessToken, refreshToken } = await this.authService.verifyCustomerOtp(
      identifier,
      dto.otp,
      ipAddress,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Public()
  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate customer using email and password' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account inactive or suspended' })
  async customerLogin(
    @Body() dto: CustomerLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.customerLogin(
      dto.email,
      dto.password,
      ipAddress,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Public()
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate staff using email and password' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account inactive or suspended' })
  async staffLogin(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.staffLogin(
      dto.email,
      dto.password,
      ipAddress,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and obtain new access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or revoked refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const rawRefreshToken = req.cookies?.refresh_token;
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      rawRefreshToken,
      ipAddress,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active session and clear authentication cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentUser('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    await this.authService.logout(userId, sessionId, ipAddress);
    this.clearAuthCookies(res);
    return { success: true, message: 'Logged out successfully.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // --- RBAC Test / Verification Endpoints ---
  @Get('test/customer')
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint accessible only by CUSTOMER' })
  async testCustomer() {
    return { access: 'granted', portal: 'customer' };
  }

  @Get('test/pharmacist')
  @Roles(UserRole.PHARMACIST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint accessible only by PHARMACIST' })
  async testPharmacist() {
    return { access: 'granted', portal: 'pharmacist' };
  }

  @Get('test/admin')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint accessible by ADMIN' })
  async testAdmin() {
    return { access: 'granted', portal: 'admin' };
  }

  @Get('test/compliance')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint accessible by ADMIN' })
  async testCompliance() {
    return { access: 'granted', resource: 'compliance_settings' };
  }
}
