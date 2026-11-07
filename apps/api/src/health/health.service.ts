import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheckResponse } from '@pharmacy/shared-types';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      const host = this.configService.get<string>('redis.host', 'localhost');
      const port = this.configService.get<number>('redis.port', 6379);
      const password = this.configService.get<string>('redis.password');

      this.redisClient = new Redis({
        host,
        port,
        password: password || undefined,
        connectTimeout: 2000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Do not retry continuously inside health check
      });
    }
    return this.redisClient;
  }

  private async pingRedis(): Promise<boolean> {
    try {
      const redis = this.getRedisClient();
      if (redis.status === 'wait' || redis.status === 'end') {
        await redis.connect();
      }
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      // Reset client so it reconnects on next check
      if (this.redisClient) {
        try {
          this.redisClient.disconnect(false);
        } catch {
          // ignore cleanup error
        }
        this.redisClient = null;
      }
      return false;
    }
  }

  async checkHealth(): Promise<{ isHealthy: boolean; response: HealthCheckResponse }> {
    // Check PostgreSQL and Redis concurrently
    const [dbHealthy, redisHealthy] = await Promise.all([this.prisma.ping(), this.pingRedis()]);

    const isHealthy = dbHealthy && redisHealthy;

    const response: HealthCheckResponse = {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'pharmacy-api',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealthy ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error',
      },
    };

    return { isHealthy, response };
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore
      }
    }
  }
}
