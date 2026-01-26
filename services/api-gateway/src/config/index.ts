import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'gateway-jwt-secret',
    issuer: process.env.JWT_ISSUER || 'medical-coverage-system',
    audience: process.env.JWT_AUDIENCE || 'medical-api-gateway',
  },

  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },

  services: {
    core: {
      url: process.env.CORE_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.CORE_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.CORE_SERVICE_RETRIES || '3', 10),
    },
    insurance: {
      url: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.INSURANCE_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.INSURANCE_SERVICE_RETRIES || '3', 10),
    },
    hospital: {
      url: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.HOSPITAL_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.HOSPITAL_SERVICE_RETRIES || '3', 10),
    },
    billing: {
      url: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.BILLING_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.BILLING_SERVICE_RETRIES || '3', 10),
    },
    claims: {
      url: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.CLAIMS_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.CLAIMS_SERVICE_RETRIES || '3', 10),
    },
    finance: {
      url: process.env.FINANCE_SERVICE_URL || 'http://localhost:3006',
      timeout: parseInt(process.env.FINANCE_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.FINANCE_SERVICE_RETRIES || '3', 10),
    },
    crm: {
      url: process.env.CRM_SERVICE_URL || 'http://localhost:3007',
      timeout: parseInt(process.env.CRM_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.CRM_SERVICE_RETRIES || '3', 10),
    },
    membership: {
      url: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3008',
      timeout: parseInt(process.env.MEMBERSHIP_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.MEMBERSHIP_SERVICE_RETRIES || '3', 10),
    },
    wellness: {
      url: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3009',
      timeout: parseInt(process.env.WELLNESS_SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.WELLNESS_SERVICE_RETRIES || '3', 10),
    },
  },

  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '2000', 10), // 2 seconds
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enabled: process.env.LOGGING_ENABLED !== 'false',
  },

  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    enableCSP: process.env.ENABLE_CSP !== 'false',
    trustProxy: process.env.TRUST_PROXY === 'true',
  },

  monitoring: {
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    metricsPath: process.env.METRICS_PATH || '/metrics',
  }
};