import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { SessionStatus, UserStatus, User } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

/**
 * Redis-backed session record.
 *
 * Sessions live in Redis (not Postgres):
 *   session:{id}               -> JSON SessionRecord (TTL = refresh token lifetime)
 *   session:refresh:{hash}     -> session id            (TTL = refresh token lifetime)
 *   session:user:{userId}      -> Set of session ids    (TTL = refresh token lifetime)
 *
 * Expiry is enforced by Redis key TTLs; revoked sessions have their keys deleted.
 */
export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
}

export interface CreateSessionResult {
  session: SessionRecord;
  refreshToken: string;
}

export interface RotateSessionResult {
  session: SessionRecord;
  refreshToken: string;
  user: User;
}

const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  private get refreshTtlSeconds(): number {
    return (
      this.configService.get<number>('auth.refreshTokenTtlSeconds') || DEFAULT_REFRESH_TTL_SECONDS
    );
  }

  private sessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private refreshKey(refreshTokenHash: string): string {
    return `session:refresh:${refreshTokenHash}`;
  }

  private userSessionsKey(userId: string): string {
    return `session:user:${userId}`;
  }

  /**
   * Creates a new active session for a user, stored entirely in Redis.
   */
  async createSession(userId: string): Promise<CreateSessionResult> {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const now = Date.now();
    const ttl = this.refreshTtlSeconds;

    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      refreshTokenHash,
      status: SessionStatus.ACTIVE,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl * 1000).toISOString(),
    };

    const serialized = JSON.stringify(session);
    await this.redisService.set(this.sessionKey(session.id), serialized, ttl);
    await this.redisService.set(this.refreshKey(refreshTokenHash), session.id, ttl);
    await this.redisService.sadd(this.userSessionsKey(userId), session.id);
    await this.redisService.expire(this.userSessionsKey(userId), ttl);

    return {
      session,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Rotates a refresh token session:
   * 1. Atomically consumes the incoming refresh token (GETDEL) to prevent replay.
   * 2. Loads and validates the session record from Redis.
   * 3. Checks that the user exists and is ACTIVE.
   * 4. Revokes the old session.
   * 5. Creates a new session and returns a new raw refresh token.
   */
  async rotateSession(rawRefreshToken: string): Promise<RotateSessionResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    // Consume the refresh token first so it cannot be replayed, even concurrently.
    const sessionId = await this.redisService.getdel(this.refreshKey(refreshTokenHash));
    if (!sessionId) {
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    const rawSession = await this.redisService.get(this.sessionKey(sessionId));
    if (!rawSession) {
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    let session: SessionRecord;
    try {
      session = JSON.parse(rawSession) as SessionRecord;
    } catch {
      await this.redisService.del(this.sessionKey(sessionId));
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    // Check if the session is still ACTIVE
    if (session.status !== SessionStatus.ACTIVE) {
      await this.deleteSessionKeys(session);
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    // Check expiration (Redis TTL normally handles this, but validate defensively)
    if (new Date() > new Date(session.expiresAt)) {
      await this.deleteSessionKeys(session);
      throw new UnauthorizedException('Refresh token has expired.');
    }

    // Verify the user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      await this.deleteSessionKeys(session);
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.deleteSessionKeys(session);
      throw new ForbiddenException('Account is not active.');
    }

    // Revoke the old session before issuing the rotated one
    await this.deleteSessionKeys(session);

    // Create a new session
    const { session: newSession, refreshToken: newRefreshToken } = await this.createSession(
      session.userId,
    );

    return {
      session: newSession,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Revokes a session on logout.
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    try {
      const rawSession = await this.redisService.get(this.sessionKey(sessionId));
      if (!rawSession) {
        await this.redisService.del(this.sessionKey(sessionId));
        return;
      }

      try {
        const session = JSON.parse(rawSession) as SessionRecord;
        await this.deleteSessionKeys(session);
      } catch {
        // Malformed session record: remove the key anyway
        await this.redisService.del(this.sessionKey(sessionId));
      }
    } catch {
      // Session already revoked or does not exist
    }
  }

  /**
   * Revokes all sessions for a user (e.g. account suspension).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.userSessionsKey(userId);
    const sessionIds = await this.redisService.smembers(userSessionsKey);

    for (const sessionId of sessionIds) {
      const rawSession = await this.redisService.get(this.sessionKey(sessionId));
      if (!rawSession) {
        await this.redisService.del(this.sessionKey(sessionId));
        continue;
      }

      try {
        const session = JSON.parse(rawSession) as SessionRecord;
        await this.deleteSessionKeys(session);
      } catch {
        await this.redisService.del(this.sessionKey(sessionId));
      }
    }

    await this.redisService.del(userSessionsKey);
  }

  /**
   * Validates if a session is currently active and not expired.
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    const rawSession = await this.redisService.get(this.sessionKey(sessionId));
    if (!rawSession) {
      return false;
    }

    try {
      const session = JSON.parse(rawSession) as SessionRecord;
      return session.status === SessionStatus.ACTIVE && new Date() <= new Date(session.expiresAt);
    } catch {
      return false;
    }
  }

  /**
   * Removes all Redis keys belonging to a session.
   */
  private async deleteSessionKeys(session: SessionRecord): Promise<void> {
    await this.redisService.del(this.sessionKey(session.id));
    await this.redisService.del(this.refreshKey(session.refreshTokenHash));
    await this.redisService.srem(this.userSessionsKey(session.userId), session.id);
  }
}
