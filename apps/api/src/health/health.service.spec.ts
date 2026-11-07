import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('HealthService Unit Tests', () => {
  let healthService: HealthService;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      ping: vi.fn(),
    };
    mockConfig = {
      get: vi.fn((_key: string, defaultValue?: any) => defaultValue),
    };

    healthService = new HealthService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
    );
  });

  afterEach(async () => {
    await healthService.onModuleDestroy();
  });

  it('should return ok when both database and redis are healthy', async () => {
    mockPrisma.ping.mockResolvedValue(true);
    vi.spyOn(healthService as any, 'pingRedis').mockResolvedValue(true);

    const { isHealthy, response } = await healthService.checkHealth();

    expect(isHealthy).toBe(true);
    expect(response.status).toBe('ok');
    expect(response.dependencies?.database).toBe('ok');
    expect(response.dependencies?.redis).toBe('ok');
  });

  it('should return degraded when database ping fails', async () => {
    mockPrisma.ping.mockResolvedValue(false);
    vi.spyOn(healthService as any, 'pingRedis').mockResolvedValue(true);

    const { isHealthy, response } = await healthService.checkHealth();

    expect(isHealthy).toBe(false);
    expect(response.status).toBe('degraded');
    expect(response.dependencies?.database).toBe('error');
    expect(response.dependencies?.redis).toBe('ok');
  });

  it('should return degraded when redis ping fails', async () => {
    mockPrisma.ping.mockResolvedValue(true);
    vi.spyOn(healthService as any, 'pingRedis').mockResolvedValue(false);

    const { isHealthy, response } = await healthService.checkHealth();

    expect(isHealthy).toBe(false);
    expect(response.status).toBe('degraded');
    expect(response.dependencies?.database).toBe('ok');
    expect(response.dependencies?.redis).toBe('error');
  });

  it('should return degraded when both database and redis fail', async () => {
    mockPrisma.ping.mockResolvedValue(false);
    vi.spyOn(healthService as any, 'pingRedis').mockResolvedValue(false);

    const { isHealthy, response } = await healthService.checkHealth();

    expect(isHealthy).toBe(false);
    expect(response.status).toBe('degraded');
    expect(response.dependencies?.database).toBe('error');
    expect(response.dependencies?.redis).toBe('error');
  });
});
