import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { normalizePhone } from '@pharmacy/validation';

export interface IOtpProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
}

@Injectable()
export class MockOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    // In production, real SMS gateway integration would happen here.
    // In development, never leak in production logs.
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[MOCK OTP] Sent to ${phone}: ${otp}`);
    }
  }
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDev: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly otpProvider: MockOtpProvider,
  ) {
    this.isDev = this.configService.get<string>('nodeEnv') === 'development';
  }

  private hashCode(phone: string, code: string): string {
    return crypto.createHash('sha256').update(`${phone}:${code}:pharmacy_otp_salt`).digest('hex');
  }

  /**
   * Generates and issues a new OTP challenge.
   * Rate limited to 3 requests per 15 minutes per phone number.
   * Invalidates any previous unconsumed challenges.
   */
  async requestOtp(
    rawPhone: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<{ success: boolean; message: string; developmentOtp?: string }> {
    const phone = normalizePhone(rawPhone);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // 1. Check rate limit: max 3 requests within 15 minutes
    const recentChallengesCount = await this.prisma.otpChallenge.count({
      where: {
        phone,
        purpose,
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (recentChallengesCount >= 3) {
      throw new HttpException(
        'Too many OTP requests. Please wait 15 minutes before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Invalidate previous unconsumed challenges for this phone & purpose
    await this.prisma.otpChallenge.updateMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    // 3. Generate OTP code
    // In dev: fixed OTP 123456
    // In prod: cryptographically random 6-digit OTP
    const code = this.isDev ? '123456' : crypto.randomInt(100000, 999999).toString();

    const codeHash = this.hashCode(phone, code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // 4. Persist challenge (hash only, never plaintext)
    await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash,
        purpose,
        expiresAt,
        attempts: 0,
      },
    });

    // 5. Send OTP via provider
    await this.otpProvider.sendOtp(phone, code);

    const response: { success: boolean; message: string; developmentOtp?: string } = {
      success: true,
      message: 'If the number can receive an OTP, instructions have been sent.',
    };

    if (this.isDev) {
      response.developmentOtp = code;
    }

    return response;
  }

  /**
   * Verifies an OTP challenge.
   * Enforces 5-minute expiration, max 5 attempts, single-use consumption.
   */
  async verifyOtp(
    rawPhone: string,
    code: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<boolean> {
    const phone = normalizePhone(rawPhone);

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    // Check attempts limit (max 5)
    if (challenge.attempts >= 5) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new code.',
      );
    }

    // Increment attempts
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });

    // Check verification
    const inputHash = this.hashCode(phone, code);
    const isCodeValid = inputHash === challenge.codeHash || (this.isDev && code === '123456');

    if (!isCodeValid) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // Consume challenge (single-use)
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return true;
  }
}
