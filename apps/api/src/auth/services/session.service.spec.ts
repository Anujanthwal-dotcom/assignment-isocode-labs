import { SessionService } from './session.service';
import { SessionStatus, UserStatus } from '@prisma/client';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('SessionService Unit Tests', () => {
  let sessionService: SessionService;
  let mockPrisma: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockPrisma = {
      authSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockTokenService = {
      generateRefreshToken: jest.fn().mockReturnValue('raw_random_token_123'),
      hashRefreshToken: jest.fn().mockReturnValue('hashed_token_123'),
    };

    sessionService = new SessionService(mockPrisma, mockTokenService);
  });

  it('should create an active session with hashed refresh token', async () => {
    mockPrisma.authSession.create.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: SessionStatus.ACTIVE,
    });

    const res = await sessionService.createSession('user-1');
    expect(res.refreshToken).toBe('raw_random_token_123');
    expect(mockPrisma.authSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          refreshTokenHash: 'hashed_token_123',
          status: SessionStatus.ACTIVE,
        }),
      }),
    );
  });

  it('should rotate session: revoking old session and issuing new one', async () => {
    const existingSession = {
      id: 'session-old',
      userId: 'user-1',
      refreshTokenHash: 'hashed_token_123',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1', status: UserStatus.ACTIVE },
    };

    mockPrisma.authSession.findUnique.mockResolvedValue(existingSession);
    mockPrisma.authSession.update.mockResolvedValue({});
    mockPrisma.authSession.create.mockResolvedValue({
      id: 'session-new',
      userId: 'user-1',
      status: SessionStatus.ACTIVE,
    });

    const res = await sessionService.rotateSession('raw_random_token_123');

    // Revokes old session
    expect(mockPrisma.authSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-old' },
        data: expect.objectContaining({ status: SessionStatus.REVOKED }),
      }),
    );

    // Creates new session
    expect(res.session.id).toBe('session-new');
  });

  it('should reject refresh if session is already REVOKED', async () => {
    const revokedSession = {
      id: 'session-revoked',
      userId: 'user-1',
      status: SessionStatus.REVOKED,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1', status: UserStatus.ACTIVE },
    };

    mockPrisma.authSession.findUnique.mockResolvedValue(revokedSession);

    await expect(sessionService.rotateSession('raw_random_token_123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject refresh if user is not ACTIVE', async () => {
    const suspendedSession = {
      id: 'session-suspended',
      userId: 'user-1',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1', status: UserStatus.SUSPENDED },
    };

    mockPrisma.authSession.findUnique.mockResolvedValue(suspendedSession);

    await expect(sessionService.rotateSession('raw_random_token_123')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
