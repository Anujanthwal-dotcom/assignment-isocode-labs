import { SessionService, SessionRecord } from './session.service';
import { SessionStatus, UserStatus } from '@prisma/client';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SessionService Unit Tests (Redis-Backed)', () => {
  let sessionService: SessionService;
  let mockPrisma: any;
  let mockTokenService: any;
  let mockRedisService: any;
  let mockConfigService: any;

  let store: Map<string, string>;
  let sets: Map<string, Set<string>>;
  let tokenCounter: number;

  const createMockRedis = () => ({
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (key: string) => {
      const existed = store.delete(key);
      sets.delete(key);
      return existed ? 1 : 0;
    }),
    getdel: vi.fn(async (key: string) => {
      const value = store.get(key) ?? null;
      store.delete(key);
      return value;
    }),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      const set = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added += 1;
        }
      }
      sets.set(key, set);
      return added;
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      const set = sets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed += 1;
      }
      return removed;
    }),
    smembers: vi.fn(async (key: string) => Array.from(sets.get(key) ?? [])),
    expire: vi.fn(async () => true),
  });

  beforeEach(() => {
    store = new Map();
    sets = new Map();
    tokenCounter = 0;

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    mockTokenService = {
      generateRefreshToken: vi.fn(() => `raw_refresh_token_${++tokenCounter}`),
      hashRefreshToken: vi.fn((token: string) => `hash_${token}`),
    };

    mockRedisService = createMockRedis();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'auth.refreshTokenTtlSeconds') return 604800;
        return defaultValue ?? null;
      }),
    };

    sessionService = new SessionService(
      mockPrisma,
      mockTokenService,
      mockRedisService,
      mockConfigService,
    );
  });

  it('creates an ACTIVE session and stores it in Redis with a TTL', async () => {
    const res = await sessionService.createSession('user-1');

    expect(res.refreshToken).toBe('raw_refresh_token_1');
    expect(res.session.status).toBe(SessionStatus.ACTIVE);
    expect(res.session.userId).toBe('user-1');

    // Session record keyed by id
    const stored = JSON.parse(store.get(`session:${res.session.id}`) as string) as SessionRecord;
    expect(stored.refreshTokenHash).toBe('hash_raw_refresh_token_1');

    // Refresh token hash points to the session
    expect(store.get('session:refresh:hash_raw_refresh_token_1')).toBe(res.session.id);

    // User session index
    expect(Array.from(sets.get('session:user:user-1') ?? [])).toEqual([res.session.id]);

    // TTL applied to all keys
    expect(mockRedisService.set).toHaveBeenCalledWith(
      `session:${res.session.id}`,
      expect.any(String),
      604800,
    );
    expect(mockRedisService.expire).toHaveBeenCalledWith('session:user:user-1', 604800);
  });

  it('rotates a session: consumes the old refresh token and issues a new one', async () => {
    const first = await sessionService.createSession('user-1');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
    });

    const rotated = await sessionService.rotateSession(first.refreshToken);

    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(rotated.session.id).not.toBe(first.session.id);
    expect(rotated.user.id).toBe('user-1');

    // Old keys are gone
    expect(store.has(`session:${first.session.id}`)).toBe(false);
    expect(store.has('session:refresh:hash_raw_refresh_token_1')).toBe(false);

    // New keys exist
    expect(store.has(`session:${rotated.session.id}`)).toBe(true);
    expect(store.get('session:refresh:hash_raw_refresh_token_2')).toBe(rotated.session.id);

    // User index only references the new session
    expect(Array.from(sets.get('session:user:user-1') ?? [])).toEqual([rotated.session.id]);
  });

  it('rejects an unknown or already-consumed refresh token', async () => {
    await expect(sessionService.rotateSession('unknown-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh token reuse after rotation', async () => {
    const first = await sessionService.createSession('user-1');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
    });

    await sessionService.rotateSession(first.refreshToken);

    await expect(sessionService.rotateSession(first.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh when the session record is missing', async () => {
    const first = await sessionService.createSession('user-1');
    // Simulate an evicted/lost session record while the refresh mapping survives
    store.delete(`session:${first.session.id}`);

    await expect(sessionService.rotateSession(first.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh if the user is not ACTIVE', async () => {
    const first = await sessionService.createSession('user-1');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.SUSPENDED,
    });

    await expect(sessionService.rotateSession(first.refreshToken)).rejects.toThrow(
      ForbiddenException,
    );

    // Session is cleaned up on failure
    expect(store.has(`session:${first.session.id}`)).toBe(false);
  });

  it('revokes a session on logout by deleting all of its keys', async () => {
    const created = await sessionService.createSession('user-1');

    await sessionService.revokeSession(created.session.id);

    expect(store.has(`session:${created.session.id}`)).toBe(false);
    expect(store.has('session:refresh:hash_raw_refresh_token_1')).toBe(false);
    expect(sets.get('session:user:user-1')?.size ?? 0).toBe(0);
  });

  it('revokes all sessions for a user', async () => {
    const first = await sessionService.createSession('user-1');
    const second = await sessionService.createSession('user-1');

    await sessionService.revokeAllUserSessions('user-1');

    expect(store.has(`session:${first.session.id}`)).toBe(false);
    expect(store.has(`session:${second.session.id}`)).toBe(false);
    expect(sets.has('session:user:user-1')).toBe(false);
  });

  it('reports session activity and expiry correctly', async () => {
    const created = await sessionService.createSession('user-1');
    expect(await sessionService.isSessionActive(created.session.id)).toBe(true);

    await sessionService.revokeSession(created.session.id);
    expect(await sessionService.isSessionActive(created.session.id)).toBe(false);

    expect(await sessionService.isSessionActive('does-not-exist')).toBe(false);
  });
});
