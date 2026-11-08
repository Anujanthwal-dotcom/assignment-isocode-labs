import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService, UserWithProfiles } from '../users/users.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CustomerRegisterDto } from './auth.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { normalizeEmail, normalizePhone } from '@pharmacy/validation';

export interface FormattedUserResponse {
  id: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    fullName: string;
    preferredLanguage?: string;
    registrationNumber?: string | null;
  };
  store?: {
    id: string;
    code: string;
    name: string;
    city?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new customer account.
   */
  async registerCustomer(
    dto: CustomerRegisterDto,
    ipAddress?: string,
  ): Promise<{ user: FormattedUserResponse; accessToken: string; refreshToken: string }> {
    const email = normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await argon2.hash(dto.password);
    }

    const user = await this.usersService.createCustomerWithEmail({
      email,
      fullName: dto.fullName,
      passwordHash,
      preferredLanguage: dto.preferredLanguage || 'en',
    });

    // Send welcome email asynchronously
    this.mailService.sendWelcomeEmail(email, dto.fullName).catch(() => {
      // Non-blocking log
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'CUSTOMER_REGISTERED',
      resourceType: 'User',
      resourceId: user.id,
      metadata: { email, method: 'EMAIL_REGISTRATION' },
      ipAddress,
    });

    // Establish session & tokens
    const { session, refreshToken } = await this.sessionService.createSession(user.id);
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AuthSession',
      resourceId: session.id,
      metadata: { method: 'REGISTRATION' },
      ipAddress,
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Request OTP for customer email or phone.
   */
  async requestCustomerOtp(identifier: string) {
    return this.otpService.requestOtp(identifier);
  }

  /**
   * Verify customer email & password, then issue login OTP (2FA flow).
   */
  async initiateCustomerLogin(
    email: string,
    pass: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; developmentOtp?: string }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.role !== UserRole.CUSTOMER || !user.passwordHash) {
      await this.auditService.record({
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        metadata: { email: normalizedEmail, reason: 'INVALID_CREDENTIALS' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, pass);
    if (!isPasswordValid) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { email: normalizedEmail, reason: 'INVALID_PASSWORD' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active. Please contact support.');
    }

    // Password verified! Generate and dispatch OTP to Redis + Email
    return this.otpService.requestOtp(normalizedEmail);
  }

  /**
   * Verify customer OTP, authenticate or register customer, and establish session.
   */
  async verifyCustomerOtp(
    rawIdentifier: string,
    otp: string,
    ipAddress?: string,
  ): Promise<{ user: FormattedUserResponse; accessToken: string; refreshToken: string }> {
    const isEmail = rawIdentifier.includes('@');
    const identifier = isEmail ? normalizeEmail(rawIdentifier) : normalizePhone(rawIdentifier);

    if (!identifier) {
      throw new BadRequestException(
        isEmail ? 'Invalid email address.' : 'Invalid phone number.',
      );
    }

    // Verify OTP against stored challenge in Redis
    await this.otpService.verifyOtp(identifier, otp);

    // Find or create customer
    let user = isEmail
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (user) {
      if (user.status !== UserStatus.ACTIVE) {
        await this.auditService.record({
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          resourceId: user.id,
          metadata: { reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
          ipAddress,
        });
        throw new ForbiddenException('Your account is not active. Please contact support.');
      }
    } else {
      user = isEmail
        ? await this.usersService.createCustomerWithEmail({
            email: identifier,
            fullName: 'Customer',
          })
        : await this.usersService.createCustomer(identifier);

      await this.auditService.record({
        actorUserId: user.id,
        action: 'CUSTOMER_REGISTERED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { identifier, method: isEmail ? 'EMAIL_OTP' : 'PHONE_OTP' },
        ipAddress,
      });
    }

    // Create session & tokens
    const { session, refreshToken } = await this.sessionService.createSession(user.id);
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AuthSession',
      resourceId: session.id,
      metadata: { method: 'OTP' },
      ipAddress,
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate staff (Pharmacist, Admin, Compliance Admin) using email and password.
   */
  async staffLogin(
    email: string,
    pass: string,
    ipAddress?: string,
  ): Promise<{ user: FormattedUserResponse; accessToken: string; refreshToken: string }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    // Reject if account not found, or is CUSTOMER, or has no password hash
    if (!user || user.role === UserRole.CUSTOMER || !user.passwordHash) {
      await this.auditService.record({
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        metadata: { email: normalizedEmail, reason: 'INVALID_CREDENTIALS' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify password with Argon2id
    const isPasswordValid = await argon2.verify(user.passwordHash, pass);
    if (!isPasswordValid) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { email: normalizedEmail, reason: 'INVALID_PASSWORD' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { email: normalizedEmail, reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
        ipAddress,
      });
      throw new ForbiddenException('Your account is not active. Please contact support.');
    }

    // Create session & tokens
    const { session, refreshToken } = await this.sessionService.createSession(user.id);
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AuthSession',
      resourceId: session.id,
      metadata: { method: 'PASSWORD', role: user.role },
      ipAddress,
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate customer using email and password.
   */
  async customerLogin(
    email: string,
    pass: string,
    ipAddress?: string,
  ): Promise<{ user: FormattedUserResponse; accessToken: string; refreshToken: string }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    // Reject if account not found, or is NOT customer, or has no password hash
    if (!user || user.role !== UserRole.CUSTOMER || !user.passwordHash) {
      await this.auditService.record({
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        metadata: { email: normalizedEmail, reason: 'INVALID_CREDENTIALS' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify password with Argon2id
    const isPasswordValid = await argon2.verify(user.passwordHash, pass);
    if (!isPasswordValid) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { email: normalizedEmail, reason: 'INVALID_PASSWORD' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { email: normalizedEmail, reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
        ipAddress,
      });
      throw new ForbiddenException('Your account is not active. Please contact support.');
    }

    // Create session & tokens
    const { session, refreshToken } = await this.sessionService.createSession(user.id);
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AuthSession',
      resourceId: session.id,
      metadata: { method: 'PASSWORD', role: user.role },
      ipAddress,
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  async refreshTokens(
    rawRefreshToken: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { session, refreshToken, user } =
      await this.sessionService.rotateSession(rawRefreshToken);

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'REFRESH_ROTATION',
      resourceType: 'AuthSession',
      resourceId: session.id,
      metadata: { newSessionId: session.id },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Revoke session on logout.
   */
  async logout(userId: string, sessionId: string, ipAddress?: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);

    await this.auditService.record({
      actorUserId: userId,
      action: 'LOGOUT',
      resourceType: 'AuthSession',
      resourceId: sessionId,
      ipAddress,
    });
  }

  /**
   * Formats the authenticated user profile based on role.
   */
  async getMe(userId: string): Promise<FormattedUserResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return this.formatUser(user);
  }

  /**
   * Role-based profile formatter.
   */
  formatUser(user: UserWithProfiles): FormattedUserResponse {
    let profileData: {
      fullName: string;
      preferredLanguage?: string;
      registrationNumber?: string | null;
    };

    let storeData: { id: string; code: string; name: string; city?: string } | undefined;

    if (user.role === UserRole.CUSTOMER && user.customerProfile) {
      profileData = {
        fullName: user.customerProfile.fullName,
        preferredLanguage: user.customerProfile.preferredLanguage,
      };
    } else if (user.role === UserRole.PHARMACIST && user.pharmacistProfile) {
      profileData = {
        fullName: user.pharmacistProfile.fullName,
        registrationNumber: user.pharmacistProfile.registrationNumber,
      };
      if (user.pharmacistProfile.store) {
        storeData = {
          id: user.pharmacistProfile.store.id,
          code: user.pharmacistProfile.store.code,
          name: user.pharmacistProfile.store.name,
          city: user.pharmacistProfile.store.city,
        };
      }
    } else {
      // ADMIN or COMPLIANCE_ADMIN
      profileData = {
        fullName: user.role === UserRole.ADMIN ? 'Administrator' : 'Compliance Administrator',
      };
    }

    return {
      id: user.id,
      role: user.role,
      status: user.status,
      profile: profileData,
      ...(storeData ? { store: storeData } : {}),
    };
  }
}
