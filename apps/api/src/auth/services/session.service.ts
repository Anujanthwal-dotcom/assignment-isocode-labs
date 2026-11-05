import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { SessionStatus, UserStatus, AuthSession, User } from '@prisma/client';

export interface CreateSessionResult {
  session: AuthSession;
  refreshToken: string;
}

export interface RotateSessionResult {
  session: AuthSession;
  refreshToken: string;
  user: User;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Creates a new active session for a user.
   */
  async createSession(userId: string): Promise<CreateSessionResult> {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        status: SessionStatus.ACTIVE,
        expiresAt,
      },
    });

    return {
      session,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Rotates a refresh token session:
   * 1. Hashes incoming refresh token.
   * 2. Finds active session. If revoked or expired, rejects.
   * 3. Checks that the user is ACTIVE.
   * 4. Revokes old session.
   * 5. Creates a new session and returns new raw refresh token.
   */
  async rotateSession(rawRefreshToken: string): Promise<RotateSessionResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    // Check if session exists and is ACTIVE
    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or revoked refresh token.');
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.EXPIRED },
      });
      throw new UnauthorizedException('Refresh token has expired.');
    }

    // Check user status
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active.');
    }

    // Revoke current session
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    // Create a new session
    const { session: newSession, refreshToken: newRefreshToken } = await this.createSession(
      session.userId,
    );

    return {
      session: newSession,
      refreshToken: newRefreshToken,
      user: session.user,
    };
  }

  /**
   * Revokes a session on logout.
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    try {
      await this.prisma.authSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    } catch {
      // Session already revoked or does not exist
    }
  }

  /**
   * Revokes all sessions for a user (e.g. account suspension).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Validates if a session is currently active and not expired.
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
    return !!session && session.status === SessionStatus.ACTIVE && new Date() <= session.expiresAt;
  }
}
