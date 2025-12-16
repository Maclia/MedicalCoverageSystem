import winston from 'winston';
import crypto from 'crypto';

export const generateCorrelationId = (): string => {
  return crypto.randomUUID();
};

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, serviceName, ...meta } = info;

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      service: 'insurance-service',
      correlationId: correlationId || 'SYSTEM',
      serviceName,
      ...meta
    };

    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'insurance-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf((info) => {
          const { timestamp, level, message, correlationId, serviceName, ...meta } = info;
          const metaStr = Object.keys(meta).length > 0 ?
            ` | ${JSON.stringify(meta)}` : '';
          const correlationStr = correlationId ? ` [${correlationId}]` : '';
          const serviceStr = serviceName ? ` [${serviceName}]` : '';
          return `${timestamp} ${level}${correlationStr}${serviceStr}: ${message}${metaStr}`;
        })
      )
    }),

    new winston.transports.File({
      filename: 'logs/insurance-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: customFormat
    }),

    new winston.transports.File({
      filename: 'logs/insurance-combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      format: customFormat
    })
  ],

  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/insurance-exceptions.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/insurance-rejections.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3
    })
  ]
});

export const createLogger = (correlationId?: string) => ({
  info: (message: string, meta?: any, serviceId?: string) => {
    logger.info(message, {
      ...meta,
      correlationId,
      serviceName: serviceId
    });
  },

  warn: (message: string, meta?: any, serviceId?: string) => {
    logger.warn(message, {
      ...meta,
      correlationId,
      serviceName: serviceId
    });
  },

  error: (message: string, error?: Error, meta?: any, serviceId?: string) => {
    logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta,
      correlationId,
      serviceName: serviceId
    });
  },

  debug: (message: string, meta?: any, serviceId?: string) => {
    logger.debug(message, {
      ...meta,
      correlationId,
      serviceName: serviceId
    });
  }
});

export const loggerInstance = createLogger();
export default loggerInstance;