import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        [key: string]: any;
      };
      correlationId?: string;
    }
  }
}

/**
 * Enhanced audit middleware for Insurance service
 * Tracks all API requests, responses, and security events
 * Standard implementation used across all modern services
 */
const logger = new WinstonLogger('insurance-service');

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

  logger.info('Insurance Request started', auditLog);

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
      logger.warn('Insurance Request completed with error', { ...auditLog, ...responseLog, error: data });
    } else {
      logger.info('Insurance Request completed successfully', { ...auditLog, ...responseLog });
    }

    // Log security events
    if (isSecurityEvent(req, res.statusCode)) {
      logSecurityEvent(req, res, correlationId);
    }

    // Log Insurance-specific events
    logInsuranceEvents(req, res, correlationId, duration);

    // Call original json method
    return originalJson.call(this, data);
  };

  // Handle response close for incomplete requests
  res.on('close', () => {
    if (!res.finished) {
      const endTime = Date.now();
      logger.warn('Insurance Request closed by client', {
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
 * Middleware to log sensitive Insurance operations
 */
export function insuranceOperationMiddleware(operation: string, resourceType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Insurance Sensitive operation initiated', {
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
 * Middleware to log data access events in Insurance
 */
export function insuranceDataAccessMiddleware(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Insurance Data access event', {
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
 * Middleware for logging scheme lifecycle events
 */
export function schemeLifecycleMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Scheme lifecycle event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      schemeId: req.params.id || req.body.schemeId,
      companyId: req.body.companyId || req.query.companyId,
      userId: extractUserId(req),
      ip: getClientIP(req),
      status: req.body.status
    });

    next();
  };
}

/**
 * Middleware for logging benefit assignment events
 */
export function benefitAssignmentMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Benefit assignment event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      benefitId: req.params.id || req.body.benefitId,
      schemeId: req.body.schemeId,
      companyId: req.body.companyId,
      userId: extractUserId(req),
      ip: getClientIP(req),
      coveragePercentage: req.body.coveragePercentage,
      limitAmount: req.body.limitAmount
    });

    next();
  };
}

/**
 * Middleware for logging premium calculation events
 */
export function premiumCalculationMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Premium calculation event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      schemeId: req.body.schemeId,
      companyId: req.body.companyId,
      memberCount: req.body.memberCount,
      userId: extractUserId(req),
      ip: getClientIP(req),
      calculatedPremium: req.body.calculatedPremium
    });

    next();
  };
}

/**
 * Middleware for logging coverage check events
 */
export function coverageCheckMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Coverage check event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      memberId: req.body.memberId || req.params.memberId,
      schemeId: req.body.schemeId,
      benefitId: req.body.benefitId,
      userId: extractUserId(req),
      ip: getClientIP(req),
      eligible: req.body.eligible,
      coverageAmount: req.body.coverageAmount
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

    logger.info(`Insurance Data ${operation} event`, {
      correlationId,
      timestamp: new Date().toISOString(),
      operation,
      dataType, // schemes, benefits, companies, policies
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
  return `ins_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    logger.error('Insurance High severity security event', securityLog);
  } else if (securityLog.severity === 'medium') {
    logger.warn('Insurance Medium severity security event', securityLog);
  } else {
    logger.info('Insurance Security event', securityLog);
  }
}

/**
 * Log Insurance-specific events
 */
function logInsuranceEvents(req: Request, res: Response, correlationId: string, duration: number): void {
  const path = req.path;
  const method = req.method;

  // Scheme creation events
  if (path.includes('/schemes') && method === 'POST' && res.statusCode < 300) {
    logger.info('Scheme created', {
      correlationId,
      duration,
      schemeId: req.body.id,
      schemeName: req.body.name
    });
  }

  // Benefit assignment events
  if (path.includes('/benefits') && path.includes('/assign') && res.statusCode < 300) {
    logger.info('Benefit assigned to company', {
      correlationId,
      duration,
      benefitId: req.body.benefitId,
      companyId: req.body.companyId
    });
  }

  // Premium calculation events
  if (path.includes('/calculate-premium') && res.statusCode < 300) {
    logger.info('Premium calculated successfully', {
      correlationId,
      duration,
      schemeId: req.body.schemeId,
      companyId: req.body.companyId
    });
  }

  // Coverage check events
  if (path.includes('/check-eligibility') && res.statusCode < 300) {
    logger.info('Eligibility check completed', {
      correlationId,
      duration,
      memberId: req.body.memberId,
      eligible: req.body.eligible
    });
  }

  // Performance metrics for slow operations
  if (duration > 2000) { // Operations taking more than 2 seconds
    logger.warn('Slow operation detected', {
      operation: `${method} ${path}`,
      duration,
      correlationId
    });
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
export { logger as insuranceAuditLogger };