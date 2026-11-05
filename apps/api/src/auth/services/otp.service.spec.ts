import { OtpService } from './otp.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';

describe('OtpService Unit Tests', () => {
  let otpService: OtpService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockOtpProvider: any;

  beforeEach(() => {
    mockPrisma = {
      otpChallenge: {
        count: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'nodeEnv') return 'development';
        return null;
      }),
    };

    mockOtpProvider = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    };

    otpService = new OtpService(mockPrisma, mockConfigService, mockOtpProvider);
  });

  describe('Rate Limiting', () => {
    it('should throw 429 when phone requests more than 3 OTPs in 15 minutes', async () => {
      mockPrisma.otpChallenge.count.mockResolvedValue(3);

      await expect(otpService.requestOtp('9876543210')).rejects.toThrow(HttpException);
      expect(mockPrisma.otpChallenge.create).not.toHaveBeenCalled();
    });

    it('should allow OTP request when rate limit is not exceeded (<3)', async () => {
      mockPrisma.otpChallenge.count.mockResolvedValue(2);
      mockPrisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.otpChallenge.create.mockResolvedValue({ id: 'test-uuid' });

      const res = await otpService.requestOtp('9876543210');
      expect(res.success).toBe(true);
      expect(res.developmentOtp).toBe('123456');
      expect(mockPrisma.otpChallenge.create).toHaveBeenCalled();
    });
  });

  describe('OTP Expiration & Single Use', () => {
    it('should reject OTP if expired', async () => {
      const expiredChallenge = {
        id: 'challenge-1',
        phone: '9876543210',
        codeHash: 'somehash',
        purpose: OtpPurpose.LOGIN,
        expiresAt: new Date(Date.now() - 1000), // expired 1 sec ago
        consumedAt: null,
        attempts: 0,
      };

      mockPrisma.otpChallenge.findFirst.mockResolvedValue(expiredChallenge);

      await expect(otpService.verifyOtp('9876543210', '123456')).rejects.toThrow(
        BadRequestException,
      );
      await expect(otpService.verifyOtp('9876543210', '123456')).rejects.toThrow(/expired/i);
    });

    it('should reject OTP if already consumed', async () => {
      // findFirst returns null if looking for consumedAt: null
      mockPrisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(otpService.verifyOtp('9876543210', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject OTP if maximum attempts (>=5) are exceeded', async () => {
      const maxAttemptsChallenge = {
        id: 'challenge-2',
        phone: '9876543210',
        codeHash: 'somehash',
        purpose: OtpPurpose.LOGIN,
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
        attempts: 5,
      };

      mockPrisma.otpChallenge.findFirst.mockResolvedValue(maxAttemptsChallenge);

      await expect(otpService.verifyOtp('9876543210', '123456')).rejects.toThrow(
        /attempts exceeded/i,
      );
    });

    it('should verify OTP and mark challenge consumed on valid input', async () => {
      const validChallenge = {
        id: 'challenge-3',
        phone: '9876543210',
        codeHash: (otpService as any).hashCode('9876543210', '123456'),
        purpose: OtpPurpose.LOGIN,
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
        attempts: 0,
      };

      mockPrisma.otpChallenge.findFirst.mockResolvedValue(validChallenge);
      mockPrisma.otpChallenge.update.mockResolvedValue({});

      const verified = await otpService.verifyOtp('9876543210', '123456');
      expect(verified).toBe(true);
      expect(mockPrisma.otpChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ consumedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
