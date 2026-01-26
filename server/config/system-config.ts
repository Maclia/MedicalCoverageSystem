// System Configuration Module
// Central configuration management for Medical Coverage System

export interface SystemConfig {
  api: {
    baseUrl: string;
    port: number;
    timeout: number;
    retries: number;
  };
  database: {
    connectionPoolSize: number;
    queryTimeout: number;
    retryAttempts: number;
  };
  modules: {
    members: {
      enabled: boolean;
      endpoints: string[];
    };
    claims: {
      enabled: boolean;
      endpoints: string[];
      autoProcessingDelay: number;
    };
    schemes: {
      enabled: boolean;
      endpoints: string[];
    };
    providers: {
      enabled: boolean;
      endpoints: string[];
      performanceThresholds: {
        qualityScore: number;
        satisfactionScore: number;
        complianceScore: number;
      };
    };
    wellness: {
      enabled: boolean;
      endpoints: string[];
      scoringWeights: {
        exercise: number;
        healthScreening: number;
        vaccination: number;
        checkup: number;
        nutrition: number;
      };
    };
    risk: {
      enabled: boolean;
      endpoints: string[];
      baseRiskScore: number;
      ageAdjustments: {
        lowRisk: { maxAge: number; adjustment: number };
        highRisk: { minAge: number; adjustment: number };
      };
    };
    premiums: {
      enabled: boolean;
      endpoints: string[];
      basePremiums: {
        standard: number;
        premium: number;
        vip: number;
      };
    };
    communication: {
      enabled: boolean;
      endpoints: string[];
      channels: ('email' | 'sms' | 'mobile_app' | 'push')[];
      personalizationLevels: ('low' | 'medium' | 'high')[];
    };
  };
  integration: {
    maxConcurrentRequests: number;
    timeout: number;
    batchSize: number;
    logging: {
      enabled: boolean;
      level: 'debug' | 'info' | 'warn' | 'error';
      retainDays: number;
    };
  };
}

// Default configuration
export const defaultConfig: SystemConfig = {
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
    port: parseInt(process.env.API_PORT || '5000'),
    timeout: parseInt(process.env.API_TIMEOUT || '30000'), // 30 seconds
    retries: parseInt(process.env.API_RETRIES || '3')
  },
  database: {
    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3')
  },
  modules: {
    members: {
      enabled: process.env.MODULE_MEMBERS_ENABLED !== 'false',
      endpoints: ['/api/members', '/api/companies']
    },
    claims: {
      enabled: process.env.MODULE_CLAIMS_ENABLED !== 'false',
      endpoints: ['/api/claims'],
      autoProcessingDelay: parseInt(process.env.CLAIMS_AUTO_PROCESSING_DELAY || '300000') // 5 minutes
    },
    schemes: {
      enabled: process.env.MODULE_SCHEMES_ENABLED !== 'false',
      endpoints: ['/api/schemes']
    },
    providers: {
      enabled: process.env.MODULE_PROVIDERS_ENABLED !== 'false',
      endpoints: ['/api/providers'],
      performanceThresholds: {
        qualityScore: parseFloat(process.env.PROVIDER_QUALITY_THRESHOLD || '3.5'),
        satisfactionScore: parseFloat(process.env.PROVIDER_SATISFACTION_THRESHOLD || '3.5'),
        complianceScore: parseFloat(process.env.PROVIDER_COMPLIANCE_THRESHOLD || '3.5')
      }
    },
    wellness: {
      enabled: process.env.MODULE_WELLNESS_ENABLED !== 'false',
      endpoints: ['/api/wellness'],
      scoringWeights: {
        exercise: parseFloat(process.env.WELLNESS_EXERCISE_WEIGHT || '10'),
        healthScreening: parseFloat(process.env.WELLNESS_SCREENING_WEIGHT || '8'),
        vaccination: parseFloat(process.env.WELLNESS_VACCINATION_WEIGHT || '10'),
        checkup: parseFloat(process.env.WELLNESS_CHECKUP_WEIGHT || '6'),
        nutrition: parseFloat(process.env.WELLNESS_NUTRITION_WEIGHT || '5')
      }
    },
    risk: {
      enabled: process.env.MODULE_RISK_ENABLED !== 'false',
      endpoints: ['/api/risk'],
      baseRiskScore: parseInt(process.env.RISK_BASE_SCORE || '50'),
      ageAdjustments: {
        lowRisk: { maxAge: 25, adjustment: -10 },
        highRisk: { minAge: 60, adjustment: 15 }
      }
    },
    premiums: {
      enabled: process.env.MODULE_PREMIUMS_ENABLED !== 'false',
      endpoints: ['/api/premiums'],
      basePremiums: {
        standard: parseInt(process.env.PREMIUM_STANDARD || '5000'),
        premium: parseInt(process.env.PREMIUM_PREMIUM || '8000'),
        vip: parseInt(process.env.PREMIUM_VIP || '12000')
      }
    },
    communication: {
      enabled: process.env.MODULE_COMMUNICATION_ENABLED !== 'false',
      endpoints: ['/api/communication'],
      channels: process.env.COMMUNICATION_CHANNELS?.split(',') as ('email' | 'sms' | 'mobile_app' | 'push')[] || ['email', 'sms', 'mobile_app'],
      personalizationLevels: process.env.COMMUNICATION_PERSONALIZATION?.split(',') as ('low' | 'medium' | 'high')[] || ['low', 'medium', 'high']
    }
  },
  integration: {
    maxConcurrentRequests: parseInt(process.env.INTEGRATION_MAX_CONCURRENT || '100'),
    timeout: parseInt(process.env.INTEGRATION_TIMEOUT || '60000'), // 1 minute
    batchSize: parseInt(process.env.INTEGRATION_BATCH_SIZE || '50'),
    logging: {
      enabled: process.env.INTEGRATION_LOGGING_ENABLED !== 'false',
      level: (process.env.INTEGRATION_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      retainDays: parseInt(process.env.INTEGRATION_LOG_RETAIN_DAYS || '30')
    }
  }
};

// Configuration singleton
let currentConfig: SystemConfig | null = null;

export const getConfig = (): SystemConfig => {
  if (!currentConfig) {
    currentConfig = defaultConfig;
  }
  return currentConfig;
};

export const updateConfig = (updates: Partial<SystemConfig>): void => {
  if (currentConfig) {
    currentConfig = { ...currentConfig, ...updates };
  } else {
    currentConfig = { ...defaultConfig, ...updates };
  }
};

// Configuration validation
export const validateConfig = (config: SystemConfig): string[] => {
  const errors: string[] = [];

  // API validation
  if (config.api.port < 1 || config.api.port > 65535) {
    errors.push('API port must be between 1 and 65535');
  }
  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  // Database validation
  if (config.database.connectionPoolSize < 1) {
    errors.push('Database pool size must be at least 1');
  }
  if (config.database.queryTimeout < 1000) {
    errors.push('Database query timeout must be at least 1000ms');
  }

  // Module validation
  Object.entries(config.modules).forEach(([moduleName, moduleConfig]) => {
    if (typeof moduleConfig.enabled !== 'boolean') {
      errors.push(`${moduleName} module enabled property must be boolean`);
    }
    if (!Array.isArray(moduleConfig.endpoints)) {
      errors.push(`${moduleName} module endpoints must be an array`);
    }
  });

  return errors;
};

// Environment-specific configurations
export const getEnvironmentConfig = (): Partial<SystemConfig> => {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'production':
      return {
        integration: {
          maxConcurrentRequests: 500,
          timeout: 30000,
          batchSize: 100,
          logging: {
            enabled: true,
            level: 'warn',
            retainDays: 90
          }
        }
      };

    case 'test':
      return {
        integration: {
          maxConcurrentRequests: 10,
          timeout: 5000,
          batchSize: 5,
          logging: {
            enabled: true,
            level: 'debug',
            retainDays: 7
          }
        }
      };

    default:
      return {}; // development uses defaults
  }
};

// Initialize configuration with environment overrides
export const initializeConfig = (): SystemConfig => {
  const envConfig = getEnvironmentConfig();
  const config = { ...defaultConfig, ...envConfig };

  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
  }

  currentConfig = config;
  return config;
};