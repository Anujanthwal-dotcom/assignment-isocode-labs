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

    authService = new AuthService(
      mockUsersService,
      mockOtpService,
      mockTokenService,
      mockSessionService,
      mockAuditService,
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
});
