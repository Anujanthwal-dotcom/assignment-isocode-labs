import { RedisService } from './redis.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RedisService Unit Tests', () => {
  let redisService: RedisService;
  let mockConfigService: any;
  let mockRedisClient: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        if (key === 'redis.password') return 'secret';
        return defaultValue ?? null;
      }),
    };

    redisService = new RedisService(mockConfigService);
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      persist: vi.fn(),
      ttl: vi.fn(),
      exists: vi.fn(),
      quit: vi.fn(),
      status: 'ready',
    };

    (redisService as any).client = mockRedisClient;
  });

  it('sets value without TTL', async () => {
    await redisService.set('otp:email:test@example.com', '123456');
    expect(mockRedisClient.set).toHaveBeenCalledWith('otp:email:test@example.com', '123456');
  });

  it('sets value with EX TTL', async () => {
    await redisService.set('otp:email:test@example.com', '123456', 300);
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'otp:email:test@example.com',
      '123456',
      'EX',
      300,
    );
  });

  it('gets value by key', async () => {
    mockRedisClient.get.mockResolvedValue('123456');
    const val = await redisService.get('otp:email:test@example.com');
    expect(val).toBe('123456');
  });

  it('deletes key', async () => {
    mockRedisClient.del.mockResolvedValue(1);
    const count = await redisService.del('otp:email:test@example.com');
    expect(count).toBe(1);
  });

  it('increments key', async () => {
    mockRedisClient.incr.mockResolvedValue(2);
    const res = await redisService.incr('rate:key');
    expect(res).toBe(2);
  });
});
