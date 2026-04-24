import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  port: process.env.PORT || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000
  }
};