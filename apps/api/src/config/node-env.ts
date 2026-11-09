export const NODE_ENVS = ['development', 'production'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];

/**
 * Resolve NODE_ENV and enforce the two-value contract used by the platform.
 * Unset values default to development; anything other than "development" or
 * "production" is a fatal configuration error.
 */
export function resolveNodeEnv(value: string | undefined = process.env.NODE_ENV): NodeEnv {
  const nodeEnv = value || 'development';

  if (nodeEnv !== 'development' && nodeEnv !== 'production') {
    throw new Error(
      `FATAL: NODE_ENV must be either "development" or "production" (received "${nodeEnv}").`,
    );
  }

  return nodeEnv;
}
