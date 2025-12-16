import winston from 'winston';
import crypto from 'crypto';

// Generate correlation ID for request tracing
export const generateCorrelationId = (): string => {
  return crypto.randomUUID();
};

// Sanitize data to remove sensitive information
const sanitizeData = (data: any): any => {
  if (!data) return data;

  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'secret', 'key',
    'ssn', 'socialSecurityNumber', 'creditCard', 'bankAccount',
    'email', 'phone', 'address', 'medicalRecord', 'patientId',
    'jwt', 'authorization', 'bearer', 'oauth'
  ];

  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /ssn/i,
    /credit.*card/i,
    /bank.*account/i,
    /medical/i,
    /patient/i
  ];

  if (typeof data === 'string') {
    // Mask potential sensitive data in strings
    let sanitized = data;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '***');
    });
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if key matches sensitive patterns
      const isSensitive = sensitiveFields.includes(key.toLowerCase()) ||
                         sensitivePatterns.some(pattern => pattern.test(key));

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
};

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      correlationId: correlationId || 'SYSTEM',
      ...sanitizeData(meta)
    };

    return JSON.stringify(logEntry);
  })
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'medical-coverage-system',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf((info) => {
          const { timestamp, level, message, correlationId, ...meta } = info;
          const metaStr = Object.keys(meta).length > 0 ?
            ` | ${JSON.stringify(sanitizeData(meta))}` : '';
          const correlationStr = correlationId ? ` [${correlationId}]` : '';
          return `${timestamp} ${level}${correlationStr}: ${message}${metaStr}`;
        })
      )
    }),

    // File transport for production logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: customFormat
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      format: customFormat
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ]
});

// Logger interface with correlation ID support
export interface Logger {
  info(message: string, meta?: any, correlationId?: string): void;
  warn(message: string, meta?: any, correlationId?: string): void;
  error(message: string, error?: Error, meta?: any, correlationId?: string): void;
  debug(message: string, meta?: any, correlationId?: string): void;
}

// Create logger instance with correlation ID support
export const createLogger = (defaultCorrelationId?: string): Logger => ({
  info: (message: string, meta?: any, correlationId?: string) => {
    logger.info(message, {
      ...meta,
      correlationId: correlationId || defaultCorrelationId
    });
  },

  warn: (message: string, meta?: any, correlationId?: string) => {
    logger.warn(message, {
      ...meta,
      correlationId: correlationId || defaultCorrelationId
    });
  },

  error: (message: string, error?: Error, meta?: any, correlationId?: string) => {
    logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta,
      correlationId: correlationId || defaultCorrelationId
    });
  },

  debug: (message: string, meta?: any, correlationId?: string) => {
    logger.debug(message, {
      ...meta,
      correlationId: correlationId || defaultCorrelationId
    });
  }
});

// Default logger instance
export const loggerInstance = createLogger();

// Audit logging helper for security events
export const auditLog = (
  action: string,
  userId: string | number,
  resource: string,
  resourceId?: string,
  changes?: any,
  ipAddress?: string,
  userAgent?: string,
  correlationId?: string
): void => {
  loggerInstance.info('AUDIT_EVENT', {
    audit: {
      action,
      userId: String(userId),
      resource,
      resourceId,
      changes: changes ? sanitizeData(changes) : undefined,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    },
    correlationId
  });
};

// Performance logging helper
export const performanceLog = (
  operation: string,
  duration: number,
  metadata?: any,
  correlationId?: string
): void => {
  loggerInstance.info('PERFORMANCE_METRIC', {
    performance: {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...sanitizeData(metadata)
    },
    correlationId
  });
};

// Security event logging helper
export const securityLog = (
  event: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  details: any,
  ipAddress?: string,
  userAgent?: string,
  correlationId?: string
): void => {
  loggerInstance.warn('SECURITY_EVENT', {
    security: {
      event,
      severity,
      details: sanitizeData(details),
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    },
    correlationId
  });
};

// Integration logging helper for external services
export const integrationLog = (
  provider: string,
  operation: string,
  success: boolean,
  duration?: number,
  error?: Error,
  correlationId?: string
): void => {
  const level = success ? 'info' : 'error';
  loggerInstance[level]('INTEGRATION_EVENT', {
    integration: {
      provider,
      operation,
      success,
      duration: duration ? `${duration}ms` : undefined,
      error: error ? {
        name: error.name,
        message: error.message
      } : undefined,
      timestamp: new Date().toISOString()
    },
    correlationId
  });
};

export default loggerInstance;