import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  port: process.env.PORT || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000
  },
  services: {
    membership: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3001',
    insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3002',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3003',
    claims: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3004',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3005',
    fraudDetection: process.env.FRAUD_SERVICE_URL || 'http://localhost:3007',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
};
