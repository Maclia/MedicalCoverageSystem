import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Enhanced audit middleware for CRM service
 * Tracks all API requests, responses, and security events
 */
const logger = new WinstonLogger('crm-service');

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

  logger.info('CRM Request started', auditLog);

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
      logger.warn('CRM Request completed with error', { ...auditLog, ...responseLog, error: data });
    } else {
      logger.info('CRM Request completed successfully', { ...auditLog, ...responseLog });
    }

    // Log security events
    if (isSecurityEvent(req, res.statusCode)) {
      logSecurityEvent(req, res, correlationId);
    }

    // Log CRM-specific events
    logCrmEvents(req, res, correlationId, duration);

    // Call original json method
    return originalJson.call(this, data);
  };

  // Handle response close for incomplete requests
  res.on('close', () => {
    if (!res.finished) {
      const endTime = Date.now();
      logger.warn('CRM Request closed by client', {
        correlationId,
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });
    }
  });

  next();
}

/**
 * Middleware to log sensitive CRM operations
 */
export function crmOperationMiddleware(operation: string, resourceType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('CRM Sensitive operation initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      operation,
      resourceType,
      userId: extractUserId(req),
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      requestData: sanitizeRequestData(req),
      resourceId: req.params.id || req.body.id
    });

    next();
  };
}

/**
 * Middleware to log data access events in CRM
 */
export function crmDataAccessMiddleware(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('CRM Data access event', {
      correlationId,
      timestamp: new Date().toISOString(),
      resource,
      action,
      method: getActionFromMethod(req.method),
      userId: extractUserId(req),
      resourceId: req.params.id || req.body.id,
      ip: getClientIP(req),
      filters: req.query,
      search: req.query.search || req.query.query
    });

    next();
  };
}

/**
 * Middleware for logging lead lifecycle events
 */
export function leadLifecycleMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Lead lifecycle event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      leadId: req.params.id || req.body.leadId,
      companyId: req.body.companyId || req.query.companyId,
      userId: extractUserId(req),
      ip: getClientIP(req),
      previousStatus: req.body.previousStatus,
      newStatus: req.body.status,
      assignedTo: req.body.assignedTo
    });

    next();
  };
}

/**
 * Middleware for logging opportunity lifecycle events
 */
export function opportunityLifecycleMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Opportunity lifecycle event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      opportunityId: req.params.id || req.body.opportunityId,
      companyId: req.body.companyId,
      amount: req.body.amount,
      stage: req.body.stage,
      status: req.body.status,
      userId: extractUserId(req),
      ip: getClientIP(req),
      probability: req.body.probability
    });

    next();
  };
}

/**
 * Middleware for logging email campaign events
 */
export function emailCampaignMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Email campaign event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      campaignId: req.params.id || req.body.campaignId,
      campaignType: req.body.type,
      recipientCount: req.body.recipientCount,
      subject: req.body.subject,
      userId: extractUserId(req),
      ip: getClientIP(req)
    });

    next();
  };
}

/**
 * Middleware for logging data export/import operations
 */
export function dataOperationMiddleware(operation: 'export' | 'import', dataType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info(`CRM Data ${operation} event`, {
      correlationId,
      timestamp: new Date().toISOString(),
      operation,
      dataType, // leads, contacts, companies, opportunities
      userId: extractUserId(req),
      ip: getClientIP(req),
      filters: req.query,
      format: req.query.format || 'json',
      recordCount: req.body.recordCount
    });

    next();
  };
}

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
 * Check if request/response is a security event
 */
function isSecurityEvent(req: Request, statusCode: number): boolean {
  const securityPaths = ['/auth', '/admin', '/bulk', '/export', '/import'];
  const isSecurityPath = securityPaths.some(path => req.path.includes(path));
  const isFailureStatus = statusCode >= 400;
  const isSensitiveOperation = req.method === 'DELETE' ||
                               req.path.includes('/bulk') ||
                               req.path.includes('/export') ||
                               req.path.includes('/import');

  return isSecurityPath || isFailureStatus || isSensitiveOperation;
}

/**
 * Log security events with enhanced details
 */
function logSecurityEvent(req: Request, res: Response, correlationId: string): void {
  const securityLog = {
    correlationId,
    timestamp: new Date().toISOString(),
    eventType: determineSecurityEventType(req, res.statusCode),
    severity: getSecuritySeverity(res.statusCode),
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    statusCode: res.statusCode,
    userId: extractUserId(req),
    suspicious: isSuspiciousActivity(req, res.statusCode)
  };

  if (securityLog.severity === 'high') {
    logger.error('CRM High severity security event', securityLog);
  } else if (securityLog.severity === 'medium') {
    logger.warn('CRM Medium severity security event', securityLog);
  } else {
    logger.info('CRM Security event', securityLog);
  }
}

/**
 * Log CRM-specific events
 */
function logCrmEvents(req: Request, res: Response, correlationId: string, duration: number): void {
  const path = req.path;
  const method = req.method;

  // Lead conversion events
  if (path.includes('/leads/') && path.includes('/convert') && res.statusCode < 300) {
    logger.logConversionCompleted(
      parseInt(req.params.id),
      0, // Will be filled by service
      0, // Will be filled by service
      { correlationId, duration }
    );
  }

  // Deal won events
  if (path.includes('/opportunities/') && res.statusCode < 300) {
    const body = req.body as any;
    if (body.status === 'won') {
      logger.logDealWon(
        parseInt(req.params.id),
        parseFloat(body.amount) || 0,
        new Date(),
        { correlationId, duration }
      );
    }
  }

  // Deal lost events
  if (path.includes('/opportunities/') && res.statusCode < 300) {
    const body = req.body as any;
    if (body.status === 'lost') {
      logger.logDealLost(
        parseInt(req.params.id),
        body.lostReason || 'Unknown',
        { correlationId, duration }
      );
    }
  }

  // Email campaign sent events
  if (path.includes('/email-campaigns/') && path.includes('/send') && res.statusCode < 300) {
    logger.logEmailCampaignSent(
      parseInt(req.params.id),
      0, // Will be filled by service
      { correlationId, duration }
    );
  }

  // Performance metrics for slow operations
  if (duration > 2000) { // Operations taking more than 2 seconds
    logger.logPerformanceMetrics(
      `${method} ${path}`,
      duration,
      { correlationId, warning: 'Slow operation detected' }
    );
  }
}

/**
 * Determine security event type
 */
function determineSecurityEventType(req: Request, statusCode: number): string {
  if (statusCode === 401) return 'authentication_failure';
  if (statusCode === 403) return 'authorization_failure';
  if (statusCode === 429) return 'rate_limit_exceeded';
  if (req.path.includes('/auth')) return 'authentication_event';
  if (req.path.includes('/admin')) return 'admin_access';
  if (req.path.includes('/export')) return 'data_export';
  if (req.path.includes('/import')) return 'data_import';
  if (req.path.includes('/bulk')) return 'bulk_operation';
  if (req.method === 'DELETE') return 'deletion_attempt';
  return 'security_event';
}

/**
 * Get security severity level
 */
function getSecuritySeverity(statusCode: number): 'low' | 'medium' | 'high' {
  if (statusCode === 401 || statusCode === 403) return 'high';
  if (statusCode >= 400) return 'medium';
  return 'low';
}

/**
 * Check for suspicious activity patterns
 */
function isSuspiciousActivity(req: Request, statusCode: number): boolean {
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script>/i, // XSS attempt
    /union.*select/i, // SQL injection attempt
    /javascript:/i, // JS injection
    /data:.*base64/i, // Data URL injection
    /admin/i, // Admin access attempts
    /root/i, // Root access attempts
  ];

  return suspiciousPatterns.some(pattern => pattern.test(req.url)) ||
         statusCode === 429 || // Rate limiting
         statusCode === 401 || // Authentication failure
         req.method === 'DELETE'; // Deletion operations
}

/**
 * Sanitize request data for logging (remove sensitive information)
 */
function sanitizeRequestData(req: Request): any {
  const sanitized = { ...req.body };

  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'creditCard',
    'ssn', 'socialSecurityNumber', 'bankAccount', 'routingNumber'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

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
 * Get CRUD action from HTTP method
 */
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

/**
 * Export audit logger for use in services
 */
export { logger as crmAuditLogger };