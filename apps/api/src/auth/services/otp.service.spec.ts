import { OtpService } from './otp.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('OtpService Unit Tests (Redis-Backed)', () => {
  let otpService: OtpService;
  let mockConfigService: any;
  let mockRedisService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'nodeEnv') return 'development';
        if (key === 'demoOtp.enabled') return true;
        if (key === 'demoOtp.code') return '123456';
        if (key === 'demoOtp.emails') return ['customer@example.com', 'customer2@example.com'];
        return defaultValue ?? null;
      }),
    };

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn(),
      expire: vi.fn().mockResolvedValue(true),
      ttl: vi.fn().mockResolvedValue(250),
    };

    mockMailService = {
      sendLoginOtpEmail: vi.fn().mockResolvedValue({ messageId: 'test-msg-id', provider: 'mock' }),
    };

    otpService = new OtpService(mockConfigService, mockRedisService, mockMailService);
  });

  describe('Demo Customer OTP', () => {
    it('pre-seeds demo accounts in Redis during onModuleInit without TTL', async () => {
      await otpService.onModuleInit();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:customer@example.com',
        expect.stringContaining('"code":"123456"'),
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:customer2@example.com',
        expect.stringContaining('"isDemo":true'),
      );
    });

    it('returns demo code without sending email when demo customer requests OTP', async () => {
      const res = await otpService.requestOtp('customer@example.com');
      expect(res.success).toBe(true);
      expect(res.developmentOtp).toBe('123456');
      expect(mockMailService.sendLoginOtpEmail).not.toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:customer@example.com',
        expect.stringContaining('"code":"123456"'),
      );
    });

    it('preserves key in Redis on successful verification for demo customer', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ code: '123456', attempts: 0, isDemo: true, createdAt: Date.now() }),
      );

      const verified = await otpService.verifyOtp('customer@example.com', '123456');
      expect(verified).toBe(true);
      // Key is preserved (not deleted)
      expect(mockRedisService.del).not.toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:customer@example.com',
        expect.stringContaining('"attempts":0'),
      );
    });
  });

  describe('Production Environment Gating (NODE_ENV=production)', () => {
    let prodOtpService: OtpService;

    beforeEach(() => {
      const prodConfigService = {
        get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'nodeEnv') return 'production';
          if (key === 'demoOtp.enabled') return true; // Even if true, production overrides
          if (key === 'demoOtp.code') return '123456';
          if (key === 'demoOtp.emails') return ['customer@example.com', 'customer2@example.com'];
          return defaultValue ?? null;
        }),
      };

      prodOtpService = new OtpService(prodConfigService as any, mockRedisService, mockMailService);
    });

    it('does NOT pre-seed demo accounts in Redis during onModuleInit in production', async () => {
      await prodOtpService.onModuleInit();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('treats demo customer as regular customer: dispatches real email and omits developmentOtp in production', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const res = await prodOtpService.requestOtp('customer@example.com');
      expect(res.success).toBe(true);
      expect(res.developmentOtp).toBeUndefined();
      expect(mockMailService.sendLoginOtpEmail).toHaveBeenCalledWith(
        'customer@example.com',
        expect.any(String),
      );
    });

    it('deletes key on success in production instead of preserving it', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ code: '555888', attempts: 0, isDemo: true, createdAt: Date.now() }),
      );

      const verified = await prodOtpService.verifyOtp('customer@example.com', '555888');
      expect(verified).toBe(true);
      expect(mockRedisService.del).toHaveBeenCalledWith('otp:email:customer@example.com');
    });
  });

  describe('Regular Customer OTP', () => {
    it('sets 5-minute TTL and sends email via MailService on requestOtp', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const res = await otpService.requestOtp('newuser@example.com');
      expect(res.success).toBe(true);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:newuser@example.com',
        expect.any(String),
        300, // 5 minutes TTL
      );
      expect(mockMailService.sendLoginOtpEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.any(String),
      );
    });

    it('enforces rate limit: throws 429 when more than 3 requests in 15 minutes', async () => {
      mockRedisService.incr.mockResolvedValue(4);

      await expect(otpService.requestOtp('regular@example.com')).rejects.toThrow(HttpException);
      expect(mockMailService.sendLoginOtpEmail).not.toHaveBeenCalled();
    });

    it('verifies valid code and strictly deletes key from Redis for single use', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ code: '948201', attempts: 0, isDemo: false, createdAt: Date.now() }),
      );

      const verified = await otpService.verifyOtp('regular@example.com', '948201');
      expect(verified).toBe(true);
      expect(mockRedisService.del).toHaveBeenCalledWith('otp:email:regular@example.com');
    });

    it('rejects if OTP has expired or does not exist in Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(otpService.verifyOtp('regular@example.com', '948201')).rejects.toThrow(
        BadRequestException,
      );
      await expect(otpService.verifyOtp('regular@example.com', '948201')).rejects.toThrow(/expired/i);
    });

    it('rejects if maximum attempts (>= 5) exceeded and deletes key', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ code: '948201', attempts: 5, isDemo: false, createdAt: Date.now() }),
      );

      await expect(otpService.verifyOtp('regular@example.com', '948201')).rejects.toThrow(
        /attempts exceeded/i,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('otp:email:regular@example.com');
    });

    it('increments attempts on invalid code mismatch', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ code: '948201', attempts: 1, isDemo: false, createdAt: Date.now() }),
      );

      await expect(otpService.verifyOtp('regular@example.com', '000000')).rejects.toThrow(
        /Invalid verification code/i,
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'otp:email:regular@example.com',
        expect.stringContaining('"attempts":2'),
        250,
      );
    });
  });
});
