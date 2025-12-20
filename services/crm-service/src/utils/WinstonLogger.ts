import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Enhanced Winston Logger for CRM Service
 * Provides structured logging with rotation and correlation IDs
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
   * Create child logger with additional context
   */
  child(defaultMeta: any): WinstonLogger {
    const childLogger = new WinstonLogger('crm-service');
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  /**
   * Log CRM-specific events
   */
  logLeadCreated(leadId: number, companyId: number, assignedTo: number, meta?: any): void {
    this.info('Lead created', {
      event: 'lead_created',
      leadId,
      companyId,
      assignedTo,
      ...meta
    });
  }

  logContactCreated(contactId: number, companyId: number, meta?: any): void {
    this.info('Contact created', {
      event: 'contact_created',
      contactId,
      companyId,
      ...meta
    });
  }

  logCompanyCreated(companyId: number, meta?: any): void {
    this.info('Company created', {
      event: 'company_created',
      companyId,
      ...meta
    });
  }

  logOpportunityCreated(opportunityId: number, companyId: number, amount: number, meta?: any): void {
    this.info('Opportunity created', {
      event: 'opportunity_created',
      opportunityId,
      companyId,
      amount: amount.toString(),
      ...meta
    });
  }

  logActivityLogged(activityType: string, activityId: number, meta?: any): void {
    this.info('Activity logged', {
      event: 'activity_logged',
      activityType,
      activityId,
      ...meta
    });
  }

  logEmailCampaignSent(campaignId: number, recipientCount: number, meta?: any): void {
    this.info('Email campaign sent', {
      event: 'email_campaign_sent',
      campaignId,
      recipientCount,
      ...meta
    });
  }

  logEmailOpened(campaignId: number, recipientId: number, meta?: any): void {
    this.info('Email opened', {
      event: 'email_opened',
      campaignId,
      recipientId,
      ...meta
    });
  }

  logEmailClicked(campaignId: number, recipientId: number, url?: string, meta?: any): void {
    this.info('Email clicked', {
      event: 'email_clicked',
      campaignId,
      recipientId,
      url,
      ...meta
    });
  }

  logDealWon(opportunityId: number, amount: number, closeDate: Date, meta?: any): void {
    this.info('Deal won', {
      event: 'deal_won',
      opportunityId,
      amount: amount.toString(),
      closeDate,
      ...meta
    });
  }

  logDealLost(opportunityId: number, reason: string, meta?: any): void {
    this.warn('Deal lost', {
      event: 'deal_lost',
      opportunityId,
      reason,
      ...meta
    });
  }

  logConversionCompleted(leadId: number, contactId: number, companyId: number, meta?: any): void {
    this.info('Lead conversion completed', {
      event: 'lead_conversion_completed',
      leadId,
      contactId,
      companyId,
      ...meta
    });
  }

  logDataExport(exportType: string, recordCount: number, userId: number, meta?: any): void {
    this.info('Data exported', {
      event: 'data_export',
      exportType,
      recordCount,
      userId,
      ...meta
    });
  }

  logDataImport(importType: string, recordCount: number, userId: number, meta?: any): void {
    this.info('Data imported', {
      event: 'data_import',
      importType,
      recordCount,
      userId,
      ...meta
    });
  }

  logSecurityEvent(eventType: string, userId: number, details: any, meta?: any): void {
    this.warn('Security event', {
      event: 'security_event',
      eventType,
      userId,
      details,
      ...meta
    });
  }

  logPerformanceMetrics(operation: string, duration: number, meta?: any): void {
    this.debug('Performance metric', {
      event: 'performance_metric',
      operation,
      duration,
      ...meta
    });
  }

  logDatabaseQuery(query: string, duration: number, success: boolean, meta?: any): void {
    this.debug('Database query', {
      event: 'database_query',
      query: query.substring(0, 200), // Limit query length
      duration,
      success,
      ...meta
    });
  }

  logApiRequest(method: string, url: string, statusCode: number, duration: number, meta?: any): void {
    this.http('API request', {
      event: 'api_request',
      method,
      url,
      statusCode,
      duration,
      ...meta
    });
  }

  logBusinessMetric(metricName: string, value: number, unit?: string, meta?: any): void {
    this.info('Business metric', {
      event: 'business_metric',
      metricName,
      value,
      unit,
      ...meta
    });
  }

  /**
   * Get logger instance for external use
   */
  getLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Update log level at runtime
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
  }
}

export default WinstonLogger;