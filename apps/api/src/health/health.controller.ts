import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@pharmacy/shared-types';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API and infrastructure health status' })
  @ApiResponse({
    status: 200,
    description: 'All services and backing dependencies are healthy',
    schema: {
      example: {
        status: 'ok',
        service: 'pharmacy-api',
        timestamp: '2026-11-05T10:00:00.000Z',
        dependencies: {
          database: 'ok',
          redis: 'ok',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more required infrastructure dependencies are unavailable',
  })
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResponse> {
    const { isHealthy, response } = await this.healthService.checkHealth();
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }
}
