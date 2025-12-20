import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3004', 10),
    host: process.env.SERVER_HOST || '0.0.0.0',
    timeout: parseInt(process.env.SERVER_TIMEOUT || '30000', 10),
    environment: process.env.NODE_ENV || 'development'
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://meduser:medpass@localhost:5432/billing_db',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'billing_db',
    user: process.env.DATABASE_USER || 'meduser',
    password: process.env.DATABASE_PASSWORD || 'medpass',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'billing-service:',
    ttl: {
      session: 3600, // 1 hour
      cache: 1800,   // 30 minutes
      rateLimit: 900 // 15 minutes
    }
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001']
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: '10MB',
    maxFiles: 5
  },

  services: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    hospitalService: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3002',
    insuranceService: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3003'
  },

  // Billing-specific configuration
  billing: {
    currency: process.env.BILLING_CURRENCY || 'KES', // Kenyan Shilling
    taxRate: parseFloat(process.env.TAX_RATE || '0.16'), // 16% VAT
    lateFeeRate: parseFloat(process.env.LATE_FEE_RATE || '0.05'), // 5% late fee
    gracePeriodDays: parseInt(process.env.GRACE_PERIOD_DAYS || '30', 10),
    minPaymentAmount: parseFloat(process.env.MIN_PAYMENT_AMOUNT || '100.00'),
    maxInvoiceAmount: parseFloat(process.env.MAX_INVOICE_AMOUNT || '1000000.00'),

    // Payment processing configuration
    payment: {
      mpesa: {
        shortCode: process.env.MPESA_SHORT_CODE || '',
        consumerKey: process.env.MPESA_CONSUMER_KEY || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        passKey: process.env.MPESA_PASS_KEY || '',
        callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:3004/api/v1/payments/mpesa/callback',
        timeout: parseInt(process.env.MPESA_TIMEOUT || '60000', 10)
      },
      stripe: {
        publicKey: process.env.STRIPE_PUBLIC_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
      }
    }
  },

  // Business logic configuration
  validation: {
    invoiceNumberMaxLength: 50,
    paymentReferenceMaxLength: 100,
    patientNotesMaxLength: 500,
    descriptionMaxLength: 1000
  },

  // Commission calculation configuration
  commission: {
    defaultRate: parseFloat(process.env.DEFAULT_COMMISSION_RATE || '0.10'), // 10%
    referralBonus: parseFloat(process.env.REFERRAL_BONUS_RATE || '0.05'), // 5%
    performanceBonus: parseFloat(process.env.PERFORMANCE_BONUS_RATE || '0.03'), // 3%
    maxCommissionRate: parseFloat(process.env.MAX_COMMISSION_RATE || '0.25'), // 25%
    minCommissionAmount: parseFloat(process.env.MIN_COMMISSION_AMOUNT || '50.00')
  },

  // Invoice and billing cycles
  billing: {
    invoiceGenerationDays: [1, 15], // 1st and 15th of each month
    paymentReminderDays: [7, 14, 21], // Send reminders at 7, 14, and 21 days
    statementGenerationDay: 1, // Generate statements on 1st of each month
    autoPaymentProcessing: process.env.AUTO_PAYMENT_PROCESSING === 'true',
    retryFailedPayments: process.env.RETRY_FAILED_PAYMENTS === 'true',
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10)
  }
};

// Validate critical configuration
if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

export default config;