import { vi } from 'vitest';

// NODE_ENV only supports "development" | "production".
// Tests run as development so dev-only OTP shortcuts remain available.
process.env.NODE_ENV = 'development';
process.env.MAIL_PROVIDER = 'mock';
process.env.REDIS_EAGER_CONNECT = 'false';
process.env.THROTTLE_LIMIT = '2000';
(globalThis as any).jest = vi;
