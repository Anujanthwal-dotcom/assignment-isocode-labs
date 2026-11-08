export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
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
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      url: process.env.REDIS_URL,
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      rootUser: process.env.MINIO_ROOT_USER || 'minio_admin',
      rootPassword: process.env.MINIO_ROOT_PASSWORD || 'minio_admin_secret_key',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      bucketPrescriptions: process.env.MINIO_BUCKET_PRESCRIPTIONS || 'prescriptions',
      bucketInventoryImports: process.env.MINIO_BUCKET_INVENTORY_IMPORTS || 'inventory-imports',
    },
    mail: {
      provider: process.env.MAIL_PROVIDER || (process.env.BREVO_API_KEY ? 'brevo' : 'mailpit'),
      apiKey: process.env.BREVO_API_KEY || '',
      smtpKey: process.env.BREVO_SMTP_KEY || '',
      smtpUser: process.env.BREVO_SMTP_USER || '',
      fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@kolkatapharmacy.com',
      fromName: process.env.MAIL_FROM_NAME || 'Kolkata Pharmacy',
      host: process.env.MAIL_HOST || 'localhost',
      smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '1025', 10),
      webPort: parseInt(process.env.MAIL_WEB_PORT || '8025', 10),
    },
    demoOtp: {
      enabled: process.env.DEMO_OTP_ENABLED !== 'false',
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
