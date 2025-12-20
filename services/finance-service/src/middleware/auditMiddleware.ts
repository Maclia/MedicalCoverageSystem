import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Enhanced audit middleware for Finance Service
 * Tracks all financial transactions with compliance features
 */
const logger = new WinstonLogger('finance-service');

/**
 * Main audit middleware
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Store correlation ID in request for use in other middleware
  (req as any).correlationId = correlationId;

  // Log request
  const auditLog = {
    correlationId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    userId: extractUserId(req),
    requestSize: req.headers['content-length'],
    startTime
  };

  logger.info('Finance Request started', auditLog);

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseLog = {
      correlationId,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(data).length,
      success: res.statusCode >= 200 && res.statusCode < 400,
      endTime
    };

    // Log completion or error
    if (res.statusCode >= 400) {
      logger.warn('Finance Request completed with error', { ...auditLog, ...responseLog, error: data });
    } else {
      logger.info('Finance Request completed successfully', { ...auditLog, ...responseLog });
    }

    // Log security events
    if (isFinancialSecurityEvent(req, res.statusCode)) {
      logFinancialSecurityEvent(req, res, correlationId);
    }

    // Log financial events
    logFinancialEvents(req, res, correlationId, duration);

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
}

/**
 * Middleware for logging financial transactions
 */
export function financialTransactionMiddleware(transactionType: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Financial transaction initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      transactionType,
      entityType,
      method: req.method,
      userId: extractUserId(req),
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      requestData: sanitizeFinancialData(req.body),
      amount: req.body.amount,
      currency: req.body.currency
    });

    next();
  };
}

/**
 * Middleware for logging compliance events
 */
export function complianceMiddleware(complianceType: string, riskLevel: 'low' | 'medium' | 'high' | 'critical') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.logComplianceEvent(complianceType, `REQ-${Date.now()}`, `${req.method} ${req.path} request`, {
      correlationId,
      riskLevel,
      userId: extractUserId(req),
      ip: getClientIP(req),
      userAgent: req.headers['user-agent']
    });

    next();
  };
}

/**
 * Middleware for logging payment processing
 */
export function paymentProcessingMiddleware(paymentMethod: string, gateway?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Payment processing initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      paymentMethod,
      gateway,
      amount: req.body.amount,
      currency: req.body.currency,
      invoiceId: req.body.invoiceId,
      userId: extractUserId(req),
      ip: getClientIP(req)
    });

    next();
  };
}

/**
 * Middleware for logging invoice operations
 */
export function invoiceOperationMiddleware(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Invoice operation initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      operation,
      invoiceId: req.params.id || req.body.invoiceId,
      amount: req.body.amount,
      memberId: req.body.memberId,
      companyId: req.body.companyId,
      userId: extractUserId(req),
      ip: getClientIP(req)
    });

    next();
  };
}

/**
 * Middleware for logging commission calculations
 */
export function commissionCalculationMiddleware(calculationType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Commission calculation initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      calculationType,
      agentId: req.body.agentId,
      transactionId: req.body.transactionId,
      baseAmount: req.body.baseAmount,
      percentage: req.body.percentage,
      userId: extractUserId(req),
      ip: getClientIP(req)
    });

    next();
  };
}

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Extract user ID from request
 */
function extractUserId(req: Request): string | undefined {
  return (req.user as any)?.userId || req.headers['x-user-id'] as string;
}

/**
 * Check if request/response is a financial security event
 */
function isFinancialSecurityEvent(req: Request, statusCode: number): boolean {
  const securityPaths = ['/auth', '/admin', '/bulk', '/export', '/import', '/refunds', '/adjustments'];
  const isSecurityPath = securityPaths.some(path => req.path.includes(path));
  const isFailureStatus = statusCode >= 400;
  const isSensitiveOperation = req.method === 'DELETE' ||
                               req.path.includes('/refunds') ||
                               req.path.includes('/adjustments') ||
                               req.path.includes('/export') ||
                               req.path.includes('/bulk');

  return isSecurityPath || isFailureStatus || isSensitiveOperation;
}

/**
 * Log financial security events with enhanced details
 */
function logFinancialSecurityEvent(req: Request, res: Response, correlationId: string): void {
  const securityLog = {
    correlationId,
    timestamp: new Date().toISOString(),
    eventType: determineFinancialSecurityEventType(req, res.statusCode),
    severity: getFinancialSecuritySeverity(res.statusCode),
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    statusCode: res.statusCode,
    userId: extractUserId(req),
    suspicious: isSuspiciousFinancialActivity(req, res.statusCode)
  };

  if (securityLog.severity === 'critical' || securityLog.severity === 'high') {
    logger.logFinancialSecurityEvent(
      securityLog.eventType,
      parseInt(extractUserId(req) || '0'),
      securityLog,
      securityLog.severity
    );
  } else if (securityLog.severity === 'medium') {
    logger.warn('Finance Medium severity security event', securityLog);
  } else {
    logger.info('Finance Security event', securityLog);
  }
}

/**
 * Log financial-specific events
 */
function logFinancialEvents(req: Request, res: Response, correlationId: string, duration: number): void {
  const path = req.path;
  const method = req.method;

  // Invoice creation events
  if (path.includes('/invoices') && method === 'POST' && res.statusCode < 300) {
    const invoiceData = req.body as any;
    logger.logInvoiceCreated(
      0, // Will be filled by service
      invoiceData.invoiceNumber || 'AUTO',
      parseFloat(invoiceData.amount || 0),
      invoiceData.memberId || 0
    );
  }

  // Invoice payment events
  if (path.includes('/payments') && method === 'POST' && res.statusCode < 300) {
    const paymentData = req.body as any;
    logger.logInvoicePaid(
      paymentData.invoiceId || 0,
      0, // Will be filled by service
      parseFloat(paymentData.amount || 0),
      paymentData.paymentMethod
    );
  }

  // Payment failure events
  if (path.includes('/payments') && res.statusCode >= 400) {
    const paymentData = req.body as any;
    logger.logPaymentFailed(
      0, // Will be filled by service
      parseFloat(paymentData.amount || 0),
      paymentData.paymentMethod || 'unknown',
      `HTTP ${res.statusCode} Error`
    );
  }

  // Refund events
  if (path.includes('/refunds') && method === 'POST' && res.statusCode < 300) {
    const refundData = req.body as any;
    logger.logRefundProcessed(
      0, // Will be filled by service
      refundData.paymentId || 0,
      parseFloat(refundData.amount || 0),
      refundData.reason || 'No reason provided'
    );
  }

  // Commission calculation events
  if (path.includes('/commissions') && method === 'POST' && res.statusCode < 300) {
    const commissionData = req.body as any;
    logger.logCommissionCalculated(
      0, // Will be filled by service
      commissionData.agentId || 0,
      parseFloat(commissionData.amount || 0),
      commissionData.transactionType || 'unknown'
    );
  }

  // Export events
  if (path.includes('/export') && res.statusCode < 300) {
    logger.logFinancialDataExport(
      path.split('/')[2] || 'unknown',
      0, // Will be filled by service
      parseInt(extractUserId(req) || '0'),
      req.query,
      { correlationId, duration }
    );
  }

  // Performance metrics for slow financial operations
  if (duration > 3000) { // Operations taking more than 3 seconds
    logger.logFinancialMetrics(
      `${method} ${path}`,
      duration,
      true,
      undefined,
      { correlationId, warning: 'Slow financial operation detected' }
    );
  }

  // High-value transaction alerts
  const amount = parseFloat(req.body.amount || 0);
  if (amount > 1000000) { // Amounts over 1M KES
    logger.logFinancialAlert(
      'high_value_transaction',
      amount > 10000000 ? 'critical' : 'high',
      `High value transaction: ${method} ${path}`,
      1000000,
      amount,
      { correlationId, userId: extractUserId(req) }
    );
  }
}

/**
 * Determine financial security event type
 */
function determineFinancialSecurityEventType(req: Request, statusCode: number): string {
  if (statusCode === 401) return 'authentication_failure';
  if (statusCode === 403) return 'authorization_failure';
  if (statusCode === 429) return 'rate_limit_exceeded';
  if (req.path.includes('/auth')) return 'authentication_event';
  if (req.path.includes('/admin')) return 'admin_access';
  if (req.path.includes('/refunds')) return 'refund_processing';
  if (req.path.includes('/adjustments')) return 'financial_adjustment';
  if (req.path.includes('/bulk')) return 'bulk_financial_operation';
  if (req.path.includes('/export')) return 'financial_data_export';
  if (req.method === 'DELETE') return 'financial_deletion';
  return 'financial_security_event';
}

/**
 * Get financial security severity level
 */
function getFinancialSecuritySeverity(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
  if (statusCode === 401 || statusCode === 403) return 'critical';
  if (statusCode >= 400) return 'high';
  return 'medium';
}

/**
 * Check for suspicious financial activity patterns
 */
function isSuspiciousFinancialActivity(req: Request, statusCode: number): boolean {
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script>/i, // XSS attempt
    /union.*select/i, // SQL injection attempt
    /javascript:/i, // JS injection
    /data:.*base64/i, // Data URL injection
    /admin/i, // Admin access attempts
    /root/i, // Root access attempts
    /hack/i, // Hacking attempts
    /exploit/i, // Exploit attempts
    /bypass/i, // Bypass attempts
  ];

  return suspiciousPatterns.some(pattern => pattern.test(req.url)) ||
         statusCode === 429 || // Rate limiting
         statusCode === 401 || // Authentication failure
         req.method === 'DELETE' || // Deletion operations
         req.path.includes('/refunds') || // Refund operations
         req.path.includes('/adjustments') || // Financial adjustments
         req.path.includes('/bulk'); // Bulk operations
}

/**
 * Sanitize financial data for logging (remove sensitive information)
 */
function sanitizeFinancialData(data: any): any {
  const sanitized = { ...data };

  // Remove highly sensitive financial fields
  const sensitiveFields = [
    'creditCardNumber', 'cardNumber', 'cvv', 'cvv2', 'expiry',
    'bankAccountNumber', 'routingNumber', 'iban', 'swift',
    'ssn', 'socialSecurityNumber', 'taxId', 'nationalId',
    'password', 'token', 'secret', 'key', 'privateKey',
    'gatewayResponse', 'gatewayTransactionId' // Keep these but log carefully
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      if (field === 'gatewayResponse' || field === 'gatewayTransactionId') {
        // Partially log gateway responses for debugging
        sanitized[field] = typeof sanitized[field] === 'string'
          ? sanitized[field].substring(0, 100) + '...'
          : '[GATEWAY_DATA]';
      } else {
        sanitized[field] = '[REDACTED]';
      }
    }
  });

  // Sanitize amounts (keep for audit but ensure they're numbers)
  if (sanitized.amount) {
    sanitized.amount = parseFloat(sanitized.amount) || 0;
  }

  // Sanitize emails partially
  if (sanitized.email && typeof sanitized.email === 'string') {
    const [username, domain] = sanitized.email.split('@');
    const sanitizedUsername = username.substring(0, 2) + '***';
    sanitized.email = `${sanitizedUsername}@${domain}`;
  }

  // Sanitize phone numbers
  if (sanitized.phone && typeof sanitized.phone === 'string') {
    sanitized.phone = sanitized.phone.replace(/\d(?=\d{4})/g, '*');
  }

  return sanitized;
}

/**
 * Export audit logger for use in services
 */
export { logger as financeAuditLogger };