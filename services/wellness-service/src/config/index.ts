import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3009', 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
  },
  database: {
    url: process.env.DATABASE_URL || '',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};