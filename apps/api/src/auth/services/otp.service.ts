import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { normalizeEmail, normalizePhone } from '@pharmacy/validation';
import { isDemoIdentifier } from '../constants/demo-accounts';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';

export interface StoredOtpData {
  code: string;
  attempts: number;
  isDemo: boolean;
  createdAt: number;
}

@Injectable()
export class OtpService implements OnModuleInit {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDev: boolean;
  private readonly demoEnabled: boolean;
  private readonly demoCode: string;
  private readonly demoEmails: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    this.isDev = nodeEnv === 'development';
    this.demoEnabled = this.isDev && this.configService.get<boolean>('demoOtp.enabled', true);
    this.demoCode = this.configService.get<string>('demoOtp.code', '123456');
    this.demoEmails = this.configService.get<string[]>('demoOtp.emails', [
      'customer@example.com',
      'customer2@example.com',
    ]);
  }

  async onModuleInit(): Promise<void> {
    if (this.demoEnabled && this.isDev) {
      try {
        for (const email of this.demoEmails) {
          const clean = normalizeEmail(email);
          if (clean) {
            const demoData: StoredOtpData = {
              code: this.demoCode,
              attempts: 0,
              isDemo: true,
              createdAt: Date.now(),
            };
            await this.redisService.set(`otp:email:${clean}`, JSON.stringify(demoData));
            this.logger.log(`Demo OTP pre-seeded in Redis for ${clean} (persistent, no TTL)`);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not pre-seed Redis on startup (Redis may be offline): ${msg}`);
      }
    }
  }

  /**
   * Request OTP code for customer email (or legacy phone).
   * For demo customers (in development mode only): sets fixed OTP in Redis without TTL.
   * For regular customers: sets random OTP in Redis with 5-minute TTL and sends via Brevo/Mail.
   */
  async requestOtp(
    rawIdentifier: string,
    _purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<{ success: boolean; message: string; developmentOtp?: string }> {
    const isEmail = rawIdentifier.includes('@');
    const identifier = isEmail ? normalizeEmail(rawIdentifier) : normalizePhone(rawIdentifier);

    if (!identifier) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const key = isEmail ? `otp:email:${identifier}` : `otp:phone:${identifier}`;
    const rateLimitKey = `otp:ratelimit:${isEmail ? 'email' : 'phone'}:${identifier}`;

    // 1. Check if demo account (ONLY in development mode)
    const isDemoAccount =
      this.isDev &&
      this.demoEnabled &&
      (isDemoIdentifier(identifier) ||
        (isEmail && this.demoEmails.includes(identifier)) ||
        (!isEmail && (identifier === '9876543210' || identifier === '9876543211')));

    if (isDemoAccount) {
      const demoData: StoredOtpData = {
        code: this.demoCode,
        attempts: 0,
        isDemo: true,
        createdAt: Date.now(),
      };
      // Stored without TTL in Redis
      await this.redisService.set(key, JSON.stringify(demoData));
      this.logger.log(`Demo OTP requested for ${identifier} -> using demo code ${this.demoCode}`);

      return {
        success: true,
        message: 'Demo code is active.',
        developmentOtp: this.demoCode,
      };
    }

    // 2. Regular user: Check Redis rate limit (max 3 requests per 15 min = 900s)
    const currentRate = await this.redisService.incr(rateLimitKey);
    if (currentRate === 1) {
      await this.redisService.expire(rateLimitKey, 900);
    }
    if (currentRate > 3) {
      throw new HttpException(
        'Too many OTP requests. Please wait 15 minutes before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Generate random 6-digit OTP
    const code = this.isDev ? '123456' : crypto.randomInt(100000, 999999).toString();
    const data: StoredOtpData = {
      code,
      attempts: 0,
      isDemo: false,
      createdAt: Date.now(),
    };

    // 4. Save in Redis with 5-minute TTL (300s)
    await this.redisService.set(key, JSON.stringify(data), 300);

    // 5. Send OTP via Brevo Transactional Email (or Mailpit)
    if (isEmail) {
      await this.mailService.sendLoginOtpEmail(identifier, code);
    }

    const response: { success: boolean; message: string; developmentOtp?: string } = {
      success: true,
      message: 'Verification code has been sent to your email address.',
    };

    if (this.isDev) {
      response.developmentOtp = code;
    }

    return response;
  }

  /**
   * Verify an OTP challenge from Redis.
   * Enforces 5-minute expiration, max 5 attempts, and deletes key for regular users.
   */
  async verifyOtp(
    rawIdentifier: string,
    code: string,
    _purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<boolean> {
    const isEmail = rawIdentifier.includes('@');
    const identifier = isEmail ? normalizeEmail(rawIdentifier) : normalizePhone(rawIdentifier);

    if (!identifier) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const key = isEmail ? `otp:email:${identifier}` : `otp:phone:${identifier}`;
    const raw = await this.redisService.get(key);

    if (!raw) {
      throw new BadRequestException(
        'Verification code has expired or does not exist. Please request a new code.',
      );
    }

    let data: StoredOtpData;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid verification state. Please request a new code.');
    }

    // Check maximum attempts (max 5)
    if (data.attempts >= 5) {
      await this.redisService.del(key);
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new code.',
      );
    }

    // Check code match (demo bypass and fallback ONLY in development mode)
    const isCodeMatch =
      data.code === code.trim() ||
      (this.isDev && this.demoEnabled && data.isDemo && code.trim() === this.demoCode) ||
      (this.isDev && code.trim() === '123456');

    if (!isCodeMatch) {
      data.attempts += 1;
      const remainingTtl = await this.redisService.ttl(key);
      if (this.isDev && this.demoEnabled && data.isDemo) {
        await this.redisService.set(key, JSON.stringify(data));
      } else if (remainingTtl > 0) {
        await this.redisService.set(key, JSON.stringify(data), remainingTtl);
      }
      throw new BadRequestException('Invalid verification code. Please check and try again.');
    }

    // On success:
    // If regular user (or in production): strictly delete key for single-use enforcement
    // If demo customer in development: keep persistent in Redis for repeated evaluation logins
    if (!this.isDev || !this.demoEnabled || !data.isDemo) {
      await this.redisService.del(key);
    } else {
      data.attempts = 0;
      await this.redisService.set(key, JSON.stringify(data));
    }

    return true;
  }
}
