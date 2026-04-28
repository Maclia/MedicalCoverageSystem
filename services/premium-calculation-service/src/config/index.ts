import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3012', 10),
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.PREMIUM_CALCULATION_DB_URL || process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  apiPrefix: '/api',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  services: {
    core: process.env.SERVICES_CORE,
    insurance: process.env.SERVICES_INSURANCE,
    membership: process.env.SERVICES_MEMBERSHIP,
  }
};
