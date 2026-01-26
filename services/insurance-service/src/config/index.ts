import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.INSURANCE_DB_URL || process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  services: {
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3001',
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    hospital: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3003',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
    claims: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  },

  business: {
    maxBenefitLimit: parseFloat(process.env.MAX_BENEFIT_LIMIT || '1000000'), // 1M default
    defaultSchemeDuration: parseInt(process.env.DEFAULT_SCHEME_DURATION || '365', 10), // 1 year
    premiumGracePeriod: parseInt(process.env.PREMIUM_GRACE_PERIOD || '30', 10), // 30 days
    claimSubmissionWindow: parseInt(process.env.CLAIM_SUBMISSION_WINDOW || '90', 10), // 90 days
    minAgeForAdult: parseInt(process.env.MIN_AGE_FOR_ADULT || '18', 10),
    maxAgeForDependent: parseInt(process.env.MAX_AGE_FOR_DEPENDENT || '25', 10),
  },

  validation: {
    schemeNameMaxLength: parseInt(process.env.SCHEME_NAME_MAX_LENGTH || '100', 10),
    schemeDescriptionMaxLength: parseInt(process.env.SCHEME_DESCRIPTION_MAX_LENGTH || '500', 10),
    benefitNameMaxLength: parseInt(process.env.BENEFIT_NAME_MAX_LENGTH || '100', 10),
    premiumRatePrecision: parseInt(process.env.PREMIUM_RATE_PRECISION || '4', 10),
    maxPremiumRate: parseFloat(process.env.MAX_PREMIUM_RATE || '10000'),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10),
  },

  caching: {
    defaultTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '300', 10), // 5 minutes
    schemeCacheTTL: parseInt(process.env.SCHEME_CACHE_TTL || '3600', 10), // 1 hour
    benefitCacheTTL: parseInt(process.env.BENEFIT_CACHE_TTL || '1800', 10), // 30 minutes
    rateCacheTTL: parseInt(process.env.RATE_CACHE_TTL || '7200', 10), // 2 hours
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enabled: process.env.LOGGING_ENABLED !== 'false',
  },

  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '100', 10),
  }
};