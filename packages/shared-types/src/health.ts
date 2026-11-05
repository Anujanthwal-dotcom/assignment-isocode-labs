export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface ServiceDependencyHealth {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
  [key: string]: string;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
  version?: string;
  dependencies?: ServiceDependencyHealth;
}
