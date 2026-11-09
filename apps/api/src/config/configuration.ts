import { resolveNodeEnv } from './node-env';

export default () => {
  const nodeEnv = resolveNodeEnv();
  const isProd = nodeEnv === 'production';

  const jwtAccessSecret =
    process.env.JWT_ACCESS_SECRET ||
    (isProd ? '' : 'dev_jwt_access_secret_super_secure_key_at_least_32_bytes');
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    (isProd ? '' : 'dev_jwt_refresh_secret_super_secure_key_at_least_32_bytes');

  if (
    isProd &&
    (!jwtAccessSecret ||
      !jwtRefreshSecret ||
      jwtAccessSecret.length < 32 ||
      jwtRefreshSecret.length < 32)
  ) {
    throw new Error(
      'FATAL: Secure JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (at least 32 characters) must be configured in production!',
    );
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3001', 10),
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL_MS || '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
    },
    corsOrigin: process.env.CORS_ORIGIN || process.env.WEB_ORIGIN || 'http://localhost:3000',
    webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    apiOrigin: process.env.API_ORIGIN || 'http://localhost:3001',
    auth: {
      jwtAccessSecret,
      jwtRefreshSecret,
      jwtIssuer: process.env.JWT_ISSUER || 'pharmacy-platform',
      jwtAudience: process.env.JWT_AUDIENCE || 'pharmacy-app',
      accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
      refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
      // Refresh-token/session lifetime in seconds (Redis TTL). Defaults to 7 days.
      refreshTokenTtlSeconds: parseInt(process.env.REFRESH_TOKEN_TTL_SECONDS || '604800', 10),
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      url: process.env.REDIS_URL,
      eagerConnect: process.env.REDIS_EAGER_CONNECT !== 'false',
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      rootUser: process.env.MINIO_ROOT_USER || 'minio_admin',
      rootPassword: process.env.MINIO_ROOT_PASSWORD || 'minio_admin_secret_key',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      bucketPrescriptions: process.env.MINIO_BUCKET_PRESCRIPTIONS || 'prescriptions',
      bucketInventoryImports: process.env.MINIO_BUCKET_INVENTORY_IMPORTS || 'inventory-imports',
      sseMode: process.env.MINIO_SERVER_SIDE_ENCRYPTION || '',
      kmsKeyId: process.env.MINIO_KMS_KEY_ID || '',
    },
    mail: {
      provider: process.env.MAIL_PROVIDER || 'brevo',
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      smtpPort: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
      smtpUser: process.env.BREVO_SMTP_USER || '',
      smtpKey: process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY || '',
      apiKey: process.env.BREVO_API_KEY || '',
      fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@kolkatapharmacy.com',
      fromName: process.env.MAIL_FROM_NAME || 'Kolkata Pharmacy',
    },
    demoOtp: {
      enabled: nodeEnv === 'development' && process.env.DEMO_OTP_ENABLED !== 'false',
      code: process.env.DEMO_OTP_CODE || '123456',
      emails: (process.env.DEMO_OTP_EMAILS || 'customer@example.com,customer2@example.com')
        .split(',')
        .map((e) => e.trim().toLowerCase()),
    },
    prescriptionAi: {
      provider: process.env.PRESCRIPTION_AI_PROVIDER || 'mock',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      timeoutMs: parseInt(process.env.PRESCRIPTION_AI_TIMEOUT_MS || '60000', 10),
      maxRetries: parseInt(process.env.PRESCRIPTION_AI_MAX_RETRIES || '2', 10),
    },
  };
};
