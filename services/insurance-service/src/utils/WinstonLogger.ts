import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Enhanced Winston Logger for Insurance Service
 * Provides structured logging with rotation and correlation IDs
 * Standard logging implementation used across all modern services
 */
export class WinstonLogger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = this.createLogger(service);
  }

  /**
   * Create Winston logger with comprehensive configuration
   */
  private createLogger(service: string): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, service: logService, correlationId, ...meta } = info;

        const logEntry = {
          timestamp,
          level,
          service: logService || service,
          correlationId,
          message,
          ...meta
        };

        return JSON.stringify(logEntry);
      })
    );

    // Define console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, service: logService, correlationId, ...meta } = info;
        const correlationStr = correlationId ? ` [${correlationId}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${logService || service}]${correlationStr} ${level}: ${message}${metaStr}`;
      })
    );

    // Transports configuration
    const transports: winston.transport[] = [];

    // Console transport for development
    if (nodeEnv !== 'production') {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: consoleFormat
        })
      );
    }

    // File transports for production and when enabled
    if (nodeEnv === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
      // Combined logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
          level: logLevel
        })
      );

      // Error logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
          level: 'error'
        })
      );

      // Access logs for audit trails
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-access-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
          level: 'http'
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        service,
        pid: process.pid,
        hostname: require('os').hostname()
      },
      transports,
      exitOnError: false
    });
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  /**
   * Log HTTP request
   */
  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  /**
   * Log with correlation ID
   */
  logWithCorrelation(level: string, message: string, correlationId: string, meta?: any): void {
    this.logger.log(level, message, {
      correlationId,
      ...meta
    });
  }

  /**
   * Get logger instance for external use
   */
  getLogger(): winston.Logger {
    return this.logger;
  }
}

export default WinstonLogger;