import winston from 'winston';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.stack ? `\n${info.stack}` : ''
    }${
      info.correlationId ? ` [${info.correlationId}]` : ''
    }${
      info.userId ? ` [user:${info.userId}]` : ''
    }`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
    level: config.logging.level
  })
];

// Add file transports if configured
if (config.logging.filePath) {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: `${config.logging.filePath}/error.log`,
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Combined log file
    new winston.transports.File({
      filename: `${config.logging.filePath}/combined.log`,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
  exitOnError: false
});

// Helper function to generate correlation ID
export const generateCorrelationId = (): string => {
  return `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper functions for structured logging with specific contexts
export const createLogger = (context?: string) => {
  return {
    error: (message: string, error?: Error | any, metadata?: any) => {
      logger.error(message, {
        ...metadata,
        stack: error?.stack || (error instanceof Error ? error.stack : undefined),
        context
      });
    },

    warn: (message: string, metadata?: any) => {
      logger.warn(message, { ...metadata, context });
    },

    info: (message: string, metadata?: any) => {
      logger.info(message, { ...metadata, context });
    },

    debug: (message: string, metadata?: any) => {
      logger.debug(message, { ...metadata, context });
    },

    http: (message: string, metadata?: any) => {
      logger.http(message, { ...metadata, context });
    }
  };
};

// Specialized logging functions for different operations
export const logAudit = (action: string, details: any, userId?: string, correlationId?: string) => {
  logger.info(`AUDIT: ${action}`, {
    type: 'AUDIT',
    action,
    userId,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logPayment = (action: string, details: any, correlationId?: string) => {
  logger.info(`PAYMENT: ${action}`, {
    type: 'PAYMENT',
    action,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logInvoice = (action: string, details: any, correlationId?: string) => {
  logger.info(`INVOICE: ${action}`, {
    type: 'INVOICE',
    action,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logCommission = (action: string, details: any, correlationId?: string) => {
  logger.info(`COMMISSION: ${action}`, {
    type: 'COMMISSION',
    action,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logSecurity = (event: string, details: any, correlationId?: string) => {
  logger.warn(`SECURITY: ${event}`, {
    type: 'SECURITY',
    event,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (operation: string, duration: number, details?: any, correlationId?: string) => {
  const level = duration > 5000 ? 'warn' : 'info';
  logger[level](`PERFORMANCE: ${operation}`, {
    type: 'PERFORMANCE',
    operation,
    duration,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logIntegration = (service: string, action: string, details: any, correlationId?: string) => {
  logger.info(`INTEGRATION: ${service.toUpperCase()} - ${action}`, {
    type: 'INTEGRATION',
    service,
    action,
    correlationId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Helper to mask sensitive information
export const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'creditCard',
    'cardNumber',
    'cvv',
    'expiry',
    'mpesaPassKey',
    'consumerSecret',
    'webhookSecret'
  ];

  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '[REDACTED]';
    }
  }

  // Handle nested objects
  for (const key in masked) {
    if (typeof masked[key] === 'object' && masked[key] !== null && !Array.isArray(masked[key])) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
};

// Database query logging
export const logQuery = (query: string, params?: any[], duration?: number, correlationId?: string) => {
  logger.debug('DB:QUERY', {
    type: 'DATABASE',
    query: query.replace(/\s+/g, ' ').trim(),
    params: params ? JSON.stringify(params) : undefined,
    duration,
    correlationId,
    timestamp: new Date().toISOString()
  });
};

// Error classification helper
export const classifyError = (error: Error): {
  category: 'validation' | 'business' | 'integration' | 'infrastructure' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
} => {
  const message = error.message.toLowerCase();

  // Classification by type
  if (error.name === 'ValidationError' || message.includes('validation')) {
    return { category: 'validation', severity: 'low', recoverable: true };
  }

  if (message.includes('permission') || message.includes('unauthorized')) {
    return { category: 'security', severity: 'medium', recoverable: false };
  }

  if (message.includes('database') || message.includes('connection')) {
    return { category: 'infrastructure', severity: 'high', recoverable: true };
  }

  if (message.includes('external') || message.includes('api') || message.includes('timeout')) {
    return { category: 'integration', severity: 'medium', recoverable: true };
  }

  // Default classification
  return { category: 'business', severity: 'medium', recoverable: true };
};

export default logger;