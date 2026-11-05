import { vi } from 'vitest';

process.env.NODE_ENV = 'development';
(globalThis as any).jest = vi;
