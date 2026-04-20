import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_fraud_detection',
    ssl: process.env.NODE_ENV === 'production',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetries: 3,
  },

  // Fraud Detection
  fraudDetection: {
    sensitivity: (process.env.FRAUD_DETECTION_SENSITIVITY || 'medium') as 'low' | 'medium' | 'high' | 'critical',

    riskThresholds: {
      alert: parseInt(process.env.FRAUD_ALERT_THRESHOLD || '30', 10),
      investigation: parseInt(process.env.FRAUD_INVESTIGATION_THRESHOLD || '50', 10),
      autoReview: parseInt(process.env.FRAUD_AUTO_REVIEW_THRESHOLD || '70', 10),
    },

    methods: {
      rulesBased: true,
      statistical: true,
      machinelearning: process.env.ENABLE_ML_DETECTION === 'true',
      networkAnalysis: process.env.ENABLE_NETWORK_ANALYSIS === 'true',
    },

    rules: {
      checkDuplicates: true,
      checkFrequency: true,
      checkAmount: true,
      checkUnbundling: true,
      checkProviderAbuse: true,
      frequencyThreshold: parseInt(process.env.FREQUENCY_THRESHOLD || '5', 10),
      amountMultiplier: parseFloat(process.env.AMOUNT_MULTIPLIER || '2.5'),
    },

    realtimeDetection: {
      enabled: process.env.REALTIME_DETECTION === 'true',
      asyncJobTimeout: 30000,
      retryAttempts: 3,
    },
  },

  // Geolocation
  geolocation: {
    enabled: process.env.GEOLOCATION_ENABLED === 'true',
    apiUrl: process.env.GEOLOCATION_API_URL || 'https://api.ipgeolocation.io',
    apiKey: process.env.GEOLOCATION_API_KEY || '',
    timeout: parseInt(process.env.GEOLOCATION_TIMEOUT || '5000', 10),
    cacheDuration: parseInt(process.env.GEOLOCATION_CACHE_DURATION || '86400', 10),
    highRiskCountries: (process.env.GEOLOCATION_HIGH_RISK_COUNTRIES || '').split(',').filter(Boolean),
  },

  // Investigation
  investigation: {
    autoAssignmentEnabled: process.env.AUTO_ASSIGN_INVESTIGATION === 'true',
    defaultTimelineHours: {
      low: 120,
      medium: 72,
      high: 24,
      critical: 1,
    },
    escalationEnabled: process.env.ESCALATION_ENABLED === 'true',
  },

  // Automated Actions
  automatedActions: {
    autoDenialEnabled: process.env.AUTO_DENIAL_ENABLED === 'true',
    autoRecoveryEnabled: process.env.AUTO_RECOVERY_ENABLED === 'true',
    recoveryAmount: parseFloat(process.env.AUTO_RECOVERY_AMOUNT || '1.2'),
  },

  // Pattern Learning
  patternLearning: {
    enabled: process.env.PATTERN_LEARNING === 'true',
    minOccurrences: parseInt(process.env.PATTERN_MIN_OCCURRENCES || '5', 10),
    confidenceThreshold: parseFloat(process.env.PATTERN_CONFIDENCE || '0.75'),
    learningWindow: parseInt(process.env.PATTERN_LEARNING_WINDOW || '90', 10),
  },

  // External Integrations
  externalDatabases: {
    mib: {
      enabled: process.env.MIB_INTEGRATION === 'true',
      apiKey: process.env.MIB_API_KEY,
      apiUrl: process.env.MIB_API_URL || 'https://api.mib.com',
      timeout: 5000,
    },
    nicb: {
      enabled: process.env.NICB_INTEGRATION === 'true',
      apiKey: process.env.NICB_API_KEY,
      apiUrl: process.env.NICB_API_URL || 'https://api.nicb.org',
      timeout: 5000,
    },
    ndh: {
      enabled: process.env.NDH_INTEGRATION === 'true',
      apiKey: process.env.NDH_API_KEY,
      apiUrl: process.env.NDH_API_URL || 'https://api.ndh.org',
      timeout: 5000,
    },
  },

  // API Gateway
  apiGateway: {
    url: process.env.API_GATEWAY_URL || 'http://localhost:5000',
    timeout: 30000,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: '24h',
  },

  // CORS
  cors: {
    allowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};
