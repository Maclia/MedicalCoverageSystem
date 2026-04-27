export const config = {
  port: process.env.FINANCE_SERVICE_PORT || 3007,
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'medical_coverage',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    pool: {
      max: 25,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
      keepAlive: true
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  jobs: {
    recoveryInterval: process.env.RECOVERY_JOB_INTERVAL || '*/15 * * * *',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  }
};

export default config;