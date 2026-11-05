import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  sessionId: string;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;
  private readonly accessTokenTtl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>(
      'auth.jwtAccessSecret',
      'dev_jwt_access_secret_super_secure_key_at_least_32_bytes',
    );
    this.jwtIssuer = this.configService.get<string>('auth.jwtIssuer', 'pharmacy-platform');
    this.jwtAudience = this.configService.get<string>('auth.jwtAudience', 'pharmacy-app');
    this.accessTokenTtl = this.configService.get<string>('auth.accessTokenTtl', '15m');
  }

  /**
   * Generates a signed JWT access token containing only sub, role, sessionId.
   */
  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        role: payload.role,
        sessionId: payload.sessionId,
      },
      {
        secret: this.jwtSecret,
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
        expiresIn: this.accessTokenTtl as any,
      },
    );
  }

  /**
   * Verifies an access token with issuer, audience, and secret checks.
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.jwtSecret,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });
  }

  /**
   * Generates a cryptographically secure random opaque refresh token.
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a refresh token with SHA-256 for persistent database storage.
   */
  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
