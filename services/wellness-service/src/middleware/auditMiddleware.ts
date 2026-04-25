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

const logger = new WinstonLogger('wellness-service');

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();

  res.setHeader('X-Correlation-ID', correlationId);
  (req as any).correlationId = correlationId;

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

  logger.info('Wellness Request started', auditLog);

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

    if (res.statusCode >= 400) {
      logger.warn('Wellness Request completed with error', { ...auditLog, ...responseLog, error: data });
    } else {
      logger.info('Wellness Request completed successfully', { ...auditLog, ...responseLog });
    }

    if (isSecurityEvent(req, res.statusCode)) {
      logSecurityEvent(req, res, correlationId);
    }

    return originalJson.call(this, data);
  };

  res.on('close', () => {
    if (!res.finished) {
      const endTime = Date.now();
      logger.warn('Wellness Request closed by client', {
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

function generateCorrelationId(): string {
  return `wel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function extractUserId(req: Request): string | undefined {
  return (req.user as any)?.userId || req.headers['x-user-id'] as string;
}

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
    logger.error('Wellness High severity security event', securityLog);
  } else if (securityLog.severity === 'medium') {
    logger.warn('Wellness Medium severity security event', securityLog);
  } else {
    logger.info('Wellness Security event', securityLog);
  }
}

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

function getSecuritySeverity(statusCode: number): 'low' | 'medium' | 'high' {
  if (statusCode === 401 || statusCode === 403) return 'high';
  if (statusCode >= 400) return 'medium';
  return 'low';
}

function isSuspiciousActivity(req: Request, statusCode: number): boolean {
  const suspiciousPatterns = [
    /\.\./,
    /<script>/i,
    /union.*select/i,
    /javascript:/i,
    /data:.*base64/i,
    /admin/i,
    /root/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(req.url)) ||
         statusCode === 429 ||
         statusCode === 401 ||
         req.method === 'DELETE';
}