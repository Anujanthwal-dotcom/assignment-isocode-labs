export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
    rootUser: process.env.MINIO_ROOT_USER,
    rootPassword: process.env.MINIO_ROOT_PASSWORD,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    bucketPrescriptions: process.env.MINIO_BUCKET_PRESCRIPTIONS || 'prescriptions',
  },
  mail: {
    host: process.env.MAIL_HOST || 'localhost',
    smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '1025', 10),
    webPort: parseInt(process.env.MAIL_WEB_PORT || '8025', 10),
  },
});
