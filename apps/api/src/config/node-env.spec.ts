import { describe, expect, it } from 'vitest';
import { NODE_ENVS, resolveNodeEnv } from './node-env';

describe('resolveNodeEnv', () => {
  it('exposes exactly two supported values', () => {
    expect(NODE_ENVS).toEqual(['development', 'production']);
  });

  it('accepts development and production', () => {
    expect(resolveNodeEnv('development')).toBe('development');
    expect(resolveNodeEnv('production')).toBe('production');
  });

  it('defaults to development when unset or empty', () => {
    expect(resolveNodeEnv(undefined)).toBe('development');
    expect(resolveNodeEnv('')).toBe('development');
  });

  it('rejects unsupported values', () => {
    expect(() => resolveNodeEnv('test')).toThrow(
      'FATAL: NODE_ENV must be either "development" or "production" (received "test").',
    );
    expect(() => resolveNodeEnv('staging')).toThrow(
      'FATAL: NODE_ENV must be either "development" or "production" (received "staging").',
    );
  });
});
