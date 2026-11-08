import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '@prisma/client';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockOtpService: any;
  let mockTokenService: any;
  let mockSessionService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockUsersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createCustomer: jest.fn(),
    };
    mockOtpService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };
    mockTokenService = {
      signAccessToken: jest.fn().mockResolvedValue('jwt_token'),
    };
    mockSessionService = {
      createSession: jest.fn().mockResolvedValue({
        session: { id: 'session-123' },
        refreshToken: 'refresh_token_123',
      }),
      rotateSession: jest.fn(),
      revokeSession: jest.fn(),
    };
    mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const mockMailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue({ messageId: 'm-1', provider: 'mock' }),
      sendLoginOtpEmail: jest.fn().mockResolvedValue({ messageId: 'm-2', provider: 'mock' }),
    };

    authService = new AuthService(
      mockUsersService,
      mockOtpService,
      mockTokenService,
      mockSessionService,
      mockAuditService,
      mockMailService as any,
    );
  });

  describe('Staff Login with Argon2id', () => {
    it('should successfully authenticate staff with valid Argon2id password hash', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-pharma-1',
        email: 'pharmacist@example.com',
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
        pharmacistProfile: {
          fullName: 'Demo Pharmacist',
          registrationNumber: null,
          store: {
            id: 'store-1',
            code: 'KOL-001',
            name: 'Salt Lake Store',
          },
        },
      });

      const res = await authService.staffLogin('pharmacist@example.com', plainPassword);
      expect(res.user.id).toBe('user-pharma-1');
      expect(res.user.role).toBe(UserRole.PHARMACIST);
      expect(res.user.store?.name).toBe('Salt Lake Store');
      expect(res.accessToken).toBe('jwt_token');
      expect(res.refreshToken).toBe('refresh_token_123');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      );
    });

    it('should reject staff login with invalid password', async () => {
      const hash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-pharma-1',
        email: 'pharmacist@example.com',
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
      });

      await expect(
        authService.staffLogin('pharmacist@example.com', 'WrongPassword!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('should reject staff login if user is SUSPENDED', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-pharma-1',
        email: 'pharmacist@example.com',
        role: UserRole.PHARMACIST,
        status: UserStatus.SUSPENDED,
        passwordHash: hash,
      });

      await expect(authService.staffLogin('pharmacist@example.com', plainPassword)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject customer account from using staff login endpoint', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-customer-1',
        email: 'cust@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash: 'somehash',
      });

      await expect(authService.staffLogin('cust@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('customerLogin', () => {
    it('should successfully authenticate customer with valid email and password', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-cust-1',
        email: 'customer@example.com',
        phone: '9876543210',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
        customerProfile: { fullName: 'Debasish Ghosh' },
      });

      const result = await authService.customerLogin('customer@example.com', plainPassword);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-cust-1');
      expect(result.user.role).toBe(UserRole.CUSTOMER);
      expect(result.user.profile.fullName).toBe('Debasish Ghosh');
      expect(result.accessToken).toBe('jwt_token');
      expect(result.refreshToken).toBe('refresh_token_123');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      );
    });

    it('should reject customer login with invalid password', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-cust-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
      });

      await expect(
        authService.customerLogin('customer@example.com', 'WrongPassword!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('should reject non-customer account from using customer login endpoint', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-pharma-1',
        email: 'pharmacist@example.com',
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
      });

      await expect(
        authService.customerLogin('pharmacist@example.com', plainPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject customer login if user is SUSPENDED', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-cust-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.SUSPENDED,
        passwordHash: hash,
      });

      await expect(
        authService.customerLogin('customer@example.com', plainPassword),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Customer Registration & Email OTP', () => {
    it('registers new customer with email and full name', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createCustomerWithEmail = jest.fn().mockResolvedValue({
        id: 'new-cust-1',
        email: 'newuser@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        customerProfile: { fullName: 'Siddhartha Roy', preferredLanguage: 'en' },
      });

      const res = await authService.registerCustomer({
        email: 'newuser@example.com',
        fullName: 'Siddhartha Roy',
        password: 'SecurePassword123!',
      });

      expect(res.user.id).toBe('new-cust-1');
      expect(res.user.profile.fullName).toBe('Siddhartha Roy');
      expect(res.accessToken).toBe('jwt_token');
      expect(mockUsersService.createCustomerWithEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newuser@example.com', fullName: 'Siddhartha Roy' }),
      );
    });

    it('authenticates customer via email OTP', async () => {
      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-cust-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        customerProfile: { fullName: 'Debasish Ghosh', preferredLanguage: 'en' },
      });

      const res = await authService.verifyCustomerOtp('customer@example.com', '123456');
      expect(res.user.id).toBe('user-cust-1');
      expect(res.accessToken).toBe('jwt_token');
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('customer@example.com', '123456');
    });

    it('verifies customer email & password and initiates OTP in 2FA login flow', async () => {
      const plainPassword = 'DemoPassword123!';
      const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-cust-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash: hash,
      });

      mockOtpService.requestOtp.mockResolvedValue({
        success: true,
        message: 'OTP sent',
        developmentOtp: '123456',
      });

      const res = await authService.initiateCustomerLogin('customer@example.com', plainPassword);
      expect(res.success).toBe(true);
      expect(res.developmentOtp).toBe('123456');
      expect(mockOtpService.requestOtp).toHaveBeenCalledWith('customer@example.com');
    });
  });
});
