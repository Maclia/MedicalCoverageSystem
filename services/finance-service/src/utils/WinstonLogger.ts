import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Enhanced Winston Logger for Finance Service
 * Provides structured logging with rotation and financial compliance features
 */
export class WinstonLogger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = this.createLogger(service);
  }

  /**
   * Create Winston logger with financial compliance configuration
   */
  private createLogger(service: string): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Define log format for finance service (more detailed for compliance)
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, service: logService, correlationId, transactionId, amount, currency, ...meta } = info;

        const logEntry = {
          timestamp,
          level,
          service: logService || service,
          correlationId,
          transactionId,
          amount: amount ? parseFloat(amount).toFixed(2) : undefined,
          currency,
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
        const { timestamp, level, message, service: logService, correlationId, transactionId, amount, currency, ...meta } = info;
        const correlationStr = correlationId ? ` [${correlationId}]` : '';
        const transactionStr = transactionId ? ` [TX:${transactionId}]` : '';
        const amountStr = amount ? ` [${currency || 'KES'} ${parseFloat(amount).toFixed(2)}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${logService || service}]${correlationStr}${transactionStr}${amountStr} ${level}: ${message}${metaStr}`;
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

    // File transports for production and compliance
    if (nodeEnv === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
      // Combined logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m', // Larger for finance logs
          maxFiles: '90d', // 90 days retention for compliance
          format: logFormat,
          level: logLevel
        })
      );

      // Financial transactions logs (critical for audit)
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-transactions-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m', // Very large for transaction logs
          maxFiles: '365d', // 1 year retention for audit compliance
          format: logFormat,
          level: 'http'
        })
      );

      // Error logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '180d', // 6 months retention for error logs
          format: logFormat,
          level: 'error'
        })
      );

      // Security logs (for audit trail)
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-security-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '30m',
          maxFiles: '365d', // 1 year retention for security logs
          format: logFormat,
          level: 'warn'
        })
      );

      // Compliance and audit logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-compliance-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '2555d', // 7 years retention for regulatory compliance
          format: logFormat,
          level: 'info'
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        service,
        pid: process.pid,
        hostname: require('os').hostname(),
        environment: nodeEnv,
        compliance: true,
        retentionPolicy: '7-years'
      },
      transports,
      exitOnError: false,
      // Add exception handling for finance service
      exceptionHandlers: [
        new winston.transports.File({
          filename: `${logDir}/${service}-exceptions.log`
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: `${logDir}/${service}-rejections.log`
        })
      ]
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
   * Log HTTP request (for audit trail)
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
   * Log with transaction ID (critical for financial audit)
   */
  logWithTransaction(level: string, message: string, transactionId: string, meta?: any): void {
    this.logger.log(level, message, {
      transactionId,
      ...meta
    });
  }

  /**
   * Log with both correlation and transaction IDs
   */
  logFinancialTransaction(level: string, message: string, correlationId: string, transactionId: string, meta?: any): void {
    this.logger.log(level, message, {
      correlationId,
      transactionId,
      compliance: true,
      ...meta
    });
  }

  /**
   * Create child logger with additional context
   */
  child(defaultMeta: any): WinstonLogger {
    const childLogger = new WinstonLogger('finance-service');
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  // Finance-specific logging methods

  /**
   * Log invoice creation
   */
  logInvoiceCreated(invoiceId: number, invoiceNumber: string, amount: number, memberId: number, meta?: any): void {
    this.logFinancialTransaction('info', 'Invoice created', '', `INV-${invoiceNumber}`, {
      event: 'invoice_created',
      invoiceId,
      invoiceNumber,
      amount,
      currency: 'KES',
      memberId,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log invoice payment
   */
  logInvoicePaid(invoiceId: number, paymentId: number, amount: number, paymentMethod: string, meta?: any): void {
    this.logFinancialTransaction('info', 'Invoice payment processed', '', `PAY-${paymentId}`, {
      event: 'invoice_paid',
      invoiceId,
      paymentId,
      amount,
      currency: 'KES',
      paymentMethod,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log payment failure
   */
  logPaymentFailed(paymentId: number, amount: number, paymentMethod: string, reason: string, meta?: any): void {
    this.logFinancialTransaction('error', 'Payment failed', '', `PAY-${paymentId}`, {
      event: 'payment_failed',
      paymentId,
      amount,
      currency: 'KES',
      paymentMethod,
      failureReason: reason,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log refund processed
   */
  logRefundProcessed(refundId: number, paymentId: number, amount: number, reason: string, meta?: any): void {
    this.logFinancialTransaction('warn', 'Refund processed', '', `REF-${refundId}`, {
      event: 'refund_processed',
      refundId,
      paymentId,
      amount,
      currency: 'KES',
      reason,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log commission calculated
   */
  logCommissionCalculated(commissionId: number, agentId: number, amount: number, transactionType: string, meta?: any): void {
    this.logFinancialTransaction('info', 'Commission calculated', '', `COM-${commissionId}`, {
      event: 'commission_calculated',
      commissionId,
      agentId,
      amount,
      currency: 'KES',
      transactionType,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log commission paid
   */
  logCommissionPaid(commissionId: number, amount: number, paymentDate: Date, meta?: any): void {
    this.logFinancialTransaction('info', 'Commission paid', '', `COM-${commissionId}`, {
      event: 'commission_paid',
      commissionId,
      amount,
      currency: 'KES',
      paymentDate,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log expense created
   */
  logExpenseCreated(expenseId: number, amount: number, category: string, vendorId: number, meta?: any): void {
    this.logFinancialTransaction('info', 'Expense created', '', `EXP-${expenseId}`, {
      event: 'expense_created',
      expenseId,
      amount,
      currency: 'KES',
      category,
      vendorId,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log budget allocated
   */
  logBudgetAllocated(budgetId: number, amount: number, category: string, departmentId: number, meta?: any): void {
    this.logFinancialTransaction('info', 'Budget allocated', '', `BUD-${budgetId}`, {
      event: 'budget_allocated',
      budgetId,
      amount,
      currency: 'KES',
      category,
      departmentId,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log financial report generated
   */
  logFinancialReportGenerated(reportId: number, reportType: string, period: string, generatedBy: number, meta?: any): void {
    this.info('Financial report generated', {
      event: 'financial_report_generated',
      reportId,
      reportType,
      period,
      generatedBy,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log data export (for audit trail)
   */
  logFinancialDataExport(exportType: string, recordCount: number, userId: number, filters: any, meta?: any): void {
    this.info('Financial data exported', {
      event: 'financial_data_export',
      exportType,
      recordCount,
      userId,
      filters,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log security event (enhanced for finance)
   */
  logFinancialSecurityEvent(eventType: string, userId: number, details: any, riskLevel: string, meta?: any): void {
    this.warn('Finance security event', {
      event: 'financial_security_event',
      eventType,
      userId,
      details,
      riskLevel,
      compliance: true,
      requiresReview: riskLevel === 'high' || riskLevel === 'critical',
      ...meta
    });
  }

  /**
   * Log compliance event
   */
  logComplianceEvent(complianceType: string, eventId: string, description: string, meta?: any): void {
    this.info('Compliance event', {
      event: 'compliance_event',
      complianceType, // GDPR, PCI-DSS, SOX, etc.
      eventId,
      description,
      compliance: true,
      auditRequired: true,
      ...meta
    });
  }

  /**
   * Log regulatory requirement
   */
  logRegulatoryRequirement(requirement: string, status: string, evidence: any, meta?: any): void {
    this.info('Regulatory requirement', {
      event: 'regulatory_requirement',
      requirement,
      status, // met, partial, not_met
      evidence,
      compliance: true,
      auditRequired: true,
      ...meta
    });
  }

  /**
   * Log data integrity check
   */
  logDataIntegrityCheck(checkType: string, result: 'pass' | 'fail', details: any, meta?: any): void {
    this.info('Data integrity check', {
      event: 'data_integrity_check',
      checkType,
      result,
      details,
      compliance: true,
      ...meta
    });
  }

  /**
   * Log audit trail event
   */
  logAuditTrail(action: string, entityType: string, entityId: number, userId: number, changes: any, meta?: any): void {
    this.logFinancialTransaction('info', 'Audit trail event', '', `AUDIT-${entityId}`, {
      event: 'audit_trail',
      action,
      entityType,
      entityId,
      userId,
      changes,
      compliance: true,
      immutable: true,
      ...meta
    });
  }

  /**
   * Log performance metrics (financial operations)
   */
  logFinancialMetrics(operation: string, duration: number, success: boolean, recordCount?: number, meta?: any): void {
    this.debug('Financial operation metrics', {
      event: 'financial_metrics',
      operation,
      duration,
      success,
      recordCount,
      ...meta
    });
  }

  /**
   * Log financial alert
   */
  logFinancialAlert(alertType: string, severity: string, message: string, threshold?: number, actualValue?: number, meta?: any): void {
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    this.logger.log(logLevel, `Financial alert: ${message}`, {
      event: 'financial_alert',
      alertType,
      severity,
      threshold,
      actualValue,
      compliance: true,
      requiresAttention: true,
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