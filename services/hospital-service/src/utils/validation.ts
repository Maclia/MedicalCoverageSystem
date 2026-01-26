import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger();

interface EnvironmentVariable {
  name: string;
  required: boolean;
  minLength?: number;
  validator?: (value: string) => boolean;
}

export async function validateEnvironmentVariables(): Promise<void> {
  const envVars: EnvironmentVariable[] = [
    // Server configuration
    { name: 'NODE_ENV', required: false },
    { name: 'PORT', required: false },
    { name: 'SERVER_HOST', required: false },
    { name: 'SERVER_TIMEOUT', required: false },

    // Database configuration
    { name: 'DATABASE_URL', required: true },
    { name: 'DATABASE_HOST', required: false },
    { name: 'DATABASE_PORT', required: false },
    { name: 'DATABASE_NAME', required: false },
    { name: 'DATABASE_USER', required: false },
    { name: 'DATABASE_PASSWORD', required: false },

    // JWT configuration
    { name: 'JWT_SECRET', required: true, minLength: 32 },
    { name: 'JWT_EXPIRES_IN', required: false },

    // Redis configuration (if using Redis for caching/sessions)
    { name: 'REDIS_URL', required: false },
    { name: 'REDIS_HOST', required: false },
    { name: 'REDIS_PORT', required: false },

    // CORS configuration
    { name: 'ALLOWED_ORIGINS', required: false },

    // Logging configuration
    { name: 'LOG_LEVEL', required: false },
    { name: 'LOG_FILE_PATH', required: false },

    // External service URLs
    { name: 'API_GATEWAY_URL', required: false },
    { name: 'AUTH_SERVICE_URL', required: false },
    { name: 'INSURANCE_SERVICE_URL', required: false },
    { name: 'BILLING_SERVICE_URL', required: false },

    // Email configuration (if sending notifications)
    { name: 'SMTP_HOST', required: false },
    { name: 'SMTP_PORT', required: false },
    { name: 'SMTP_USER', required: false },
    { name: 'SMTP_PASSWORD', required: false },

    // File storage configuration
    { name: 'UPLOAD_PATH', required: false },
    { name: 'MAX_FILE_SIZE', required: false },

    // Monitoring and metrics
    { name: 'PROMETHEUS_PORT', required: false },
    { name: 'HEALTH_CHECK_INTERVAL', required: false }
  ];

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of envVars) {
    const value = process.env[envVar.name];

    if (envVar.required && (!value || value.trim() === '')) {
      errors.push(`Required environment variable ${envVar.name} is missing or empty`);
      continue;
    }

    if (value && envVar.minLength && value.length < envVar.minLength) {
      errors.push(`Environment variable ${envVar.name} must be at least ${envVar.minLength} characters long`);
      continue;
    }

    if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(`Environment variable ${envVar.name} has an invalid value`);
      continue;
    }

    // Additional validations
    switch (envVar.name) {
      case 'NODE_ENV':
        if (value && !['development', 'production', 'test'].includes(value)) {
          warnings.push(`Invalid NODE_ENV: ${value}. Should be one of: development, production, test`);
        }
        break;

      case 'PORT':
        if (value) {
          const port = parseInt(value);
          if (isNaN(port) || port < 1 || port > 65535) {
            errors.push(`Invalid PORT: ${value}. Should be a number between 1 and 65535`);
          }
        }
        break;

      case 'DATABASE_PORT':
      case 'REDIS_PORT':
      case 'SMTP_PORT':
      case 'PROMETHEUS_PORT':
        if (value) {
          const port = parseInt(value);
          if (isNaN(port) || port < 1 || port > 65535) {
            errors.push(`Invalid ${envVar.name}: ${value}. Should be a number between 1 and 65535`);
          }
        }
        break;

      case 'LOG_LEVEL':
        if (value && !['error', 'warn', 'info', 'debug'].includes(value)) {
          warnings.push(`Invalid LOG_LEVEL: ${value}. Should be one of: error, warn, info, debug`);
        }
        break;

      case 'JWT_EXPIRES_IN':
        if (value) {
          // Validate format like "15m", "7d", "1h"
          const timeRegex = /^\d+[smhd]$/;
          if (!timeRegex.test(value)) {
            warnings.push(`Invalid JWT_EXPIRES_IN format: ${value}. Should be like: 15m, 7d, 1h`);
          }
        }
        break;

      case 'MAX_FILE_SIZE':
        if (value) {
          // Validate format like "10MB", "1GB"
          const sizeRegex = /^\d+[KMGT]?B$/i;
          if (!sizeRegex.test(value)) {
            warnings.push(`Invalid MAX_FILE_SIZE format: ${value}. Should be like: 10MB, 1GB`);
          }
        }
        break;

      case 'HEALTH_CHECK_INTERVAL':
        if (value) {
          const interval = parseInt(value);
          if (isNaN(interval) || interval < 1000) {
            warnings.push(`Invalid HEALTH_CHECK_INTERVAL: ${value}. Should be at least 1000ms`);
          }
        }
        break;
    }
  }

  // Security-specific validations
  if (process.env.JWT_SECRET) {
    // Check for common weak secrets
    const weakSecrets = [
      'secret', 'password', '123456', 'qwerty', 'admin',
      'default', 'test', 'dev', 'development', 'jwt_secret'
    ];

    if (weakSecrets.includes(process.env.JWT_SECRET.toLowerCase())) {
      errors.push('JWT_SECRET appears to be weak. Please use a strong, unique secret');
    }

    // Check if it's the default development secret
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET is set to the default value. Please change it for production');
    }
  }

  // Database URL validation
  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
        errors.push('DATABASE_URL must be a PostgreSQL connection string starting with postgresql://');
      }

      // Check for SSL requirement in production
      if (process.env.NODE_ENV === 'production' && !dbUrl.includes('sslmode=')) {
        warnings.push('DATABASE_URL should include SSL mode (sslmode=require) in production');
      }
    } catch (error) {
      errors.push('DATABASE_URL format is invalid');
    }
  }

  // Log results
  if (warnings.length > 0) {
    logger.warn('Environment variable validation warnings', { warnings });
  }

  if (errors.length > 0) {
    logger.error('Environment variable validation failed', { errors });
    throw new Error(`Environment variable validation failed:\n${errors.join('\n')}`);
  }

  logger.info('Environment variable validation completed successfully');
}

export function validateDatabaseConnection(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const { db } = await import('../config/database');

      // Test database connection with a simple query
      await db.execute('SELECT 1');

      logger.info('Database connection validation successful');
      resolve(true);
    } catch (error) {
      logger.error('Database connection validation failed', error as Error);
      resolve(false);
    }
  });
}

export function validateServiceHealth(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      // Check if essential services are reachable
      const checks: Promise<boolean>[] = [];

      // Add database health check
      checks.push(validateDatabaseConnection());

      // Add Redis health check if configured
      if (config.redis.url) {
        checks.push(validateRedisConnection());
      }

      // Add external service health checks if URLs are configured
      if (config.services.authService) {
        checks.push(validateExternalServiceHealth('auth-service', config.services.authService));
      }

      if (config.services.insuranceService) {
        checks.push(validateExternalServiceHealth('insurance-service', config.services.insuranceService));
      }

      const results = await Promise.allSettled(checks);
      const allHealthy = results.every(result => result.status === 'fulfilled' && result.value === true);

      if (allHealthy) {
        logger.info('All service health checks passed');
      } else {
        logger.warn('Some service health checks failed', { results });
      }

      resolve(allHealthy);
    } catch (error) {
      logger.error('Service health validation failed', error as Error);
      resolve(false);
    }
  });
}

async function validateRedisConnection(): Promise<boolean> {
  try {
    // Implement Redis connection check
    // This would require Redis client configuration
    logger.debug('Redis connection validation');
    return true; // Placeholder
  } catch (error) {
    logger.error('Redis connection validation failed', error as Error);
    return false;
  }
}

async function validateExternalServiceHealth(serviceName: string, serviceUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      logger.debug(`Health check passed for ${serviceName}`, { serviceUrl });
      return true;
    } else {
      logger.warn(`Health check failed for ${serviceName}`, {
        serviceUrl,
        status: response.status
      });
      return false;
    }
  } catch (error) {
    logger.error(`Health check error for ${serviceName}`, error as Error, { serviceUrl });
    return false;
  }
}

export function validateConfiguration(): boolean {
  try {
    // Validate business logic configuration
    const businessErrors: string[] = [];

    if (config.business.minAppointmentDuration >= config.business.maxAppointmentDuration) {
      businessErrors.push('minAppointmentDuration must be less than maxAppointmentDuration');
    }

    if (config.business.maxAppointmentAdvance < 1) {
      businessErrors.push('maxAppointmentAdvance must be at least 1 day');
    }

    if (config.validation.patientNameMaxLength < 1) {
      businessErrors.push('patientNameMaxLength must be at least 1 character');
    }

    if (config.validation.patientPhoneMaxLength < 1) {
      businessErrors.push('patientPhoneMaxLength must be at least 1 character');
    }

    if (businessErrors.length > 0) {
      logger.error('Configuration validation failed', { errors: businessErrors });
      return false;
    }

    logger.info('Configuration validation successful');
    return true;
  } catch (error) {
    logger.error('Configuration validation error', error as Error);
    return false;
  }
}