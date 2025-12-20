import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Enhanced audit middleware for comprehensive logging
 * Tracks all API requests, responses, and security events
 */
const logger = new WinstonLogger('membership-service');

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
    companyId: extractCompanyId(req),
    memberId: extractMemberId(req),
    requestSize: req.headers['content-length'],
    startTime
  };

  logger.info('Request started', auditLog);

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
      logger.warn('Request completed with error', { ...auditLog, ...responseLog, error: data });
    } else {
      logger.info('Request completed successfully', { ...auditLog, ...responseLog });
    }

    // Log security events
    if (isSecurityEvent(req, res.statusCode)) {
      logSecurityEvent(req, res, correlationId);
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  // Handle response close for incomplete requests
  res.on('close', () => {
    if (!res.finished) {
      const endTime = Date.now();
      logger.warn('Request closed by client', {
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
 * Middleware to log sensitive operations
 */
export function sensitiveOperationMiddleware(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Sensitive operation initiated', {
      correlationId,
      timestamp: new Date().toISOString(),
      operation,
      userId: extractUserId(req),
      companyId: extractCompanyId(req),
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      requestData: sanitizeRequestData(req)
    });

    next();
  };
}

/**
 * Middleware to log data access events
 */
export function dataAccessMiddleware(resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Data access event', {
      correlationId,
      timestamp: new Date().toISOString(),
      resource,
      action: getActionFromMethod(req.method),
      userId: extractUserId(req),
      companyId: extractCompanyId(req),
      resourceId: req.params.id || req.params.memberId,
      ip: getClientIP(req)
    });

    next();
  };
}

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
 * Extract company ID from request
 */
function extractCompanyId(req: Request): string | undefined {
  return (req.user as any)?.companyId || req.headers['x-company-id'] as string || req.body.companyId;
}

/**
 * Extract member ID from request
 */
function extractMemberId(req: Request): string | undefined {
  return req.params.id || req.params.memberId || req.body.memberId;
}

/**
 * Check if request/response is a security event
 */
function isSecurityEvent(req: Request, statusCode: number): boolean {
  const securityPaths = ['/auth/login', '/auth/logout', '/admin', '/sensitive'];
  const isSecurityPath = securityPaths.some(path => req.path.includes(path));
  const isFailureStatus = statusCode >= 400;
  const isAuthPath = req.path.includes('/auth');

  return isSecurityPath || isFailureStatus || isAuthPath;
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
    companyId: extractCompanyId(req),
    suspicious: isSuspiciousActivity(req, res.statusCode)
  };

  if (securityLog.severity === 'high') {
    logger.error('High severity security event', securityLog);
  } else if (securityLog.severity === 'medium') {
    logger.warn('Medium severity security event', securityLog);
  } else {
    logger.info('Security event', securityLog);
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
  ];

  return suspiciousPatterns.some(pattern => pattern.test(req.url)) ||
         statusCode === 429 || // Rate limiting
         statusCode === 401;   // Authentication failure
}

/**
 * Sanitize request data for logging (remove sensitive information)
 */
function sanitizeRequestData(req: Request): any {
  const sanitized = { ...req.body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

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
 * Middleware for logging member lifecycle events
 */
export function memberLifecycleMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId || generateCorrelationId();

    logger.info('Member lifecycle event', {
      correlationId,
      timestamp: new Date().toISOString(),
      eventType,
      memberId: req.params.id || req.body.memberId,
      companyId: extractCompanyId(req),
      userId: extractUserId(req),
      ip: getClientIP(req),
      requestData: sanitizeRequestData(req)
    });

    next();
  };
}

/**
 * Export audit logger for use in services
 */
export { logger as auditLogger };