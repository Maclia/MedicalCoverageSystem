import { Request, Response, NextFunction } from 'express';
import { createLogger, generateCorrelationId } from '../utils/logger';
import { db } from '../config/database';
import { billingAuditLogs } from '../models/schema';

const logger = createLogger();

// Extend Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: any;
    }
  }
}

export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Generate correlation ID if not present
  const correlationId = req.correlationId || generateCorrelationId();
  req.correlationId = correlationId;

  // Start time for performance tracking
  const startTime = Date.now();

  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId
  });

  // Override res.json to capture response
  const originalJson = res.json;
  let responseData: any;
  let statusCode: number;

  res.json = function(data: any) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  // Capture response end
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      correlationId
    });

    // Create audit entry for sensitive billing operations
    const sensitiveOperations = [
      'POST',
      'PUT',
      'DELETE',
      'PATCH'
    ];

    const sensitiveEndpoints = [
      '/invoices',
      '/payments',
      '/commissions',
      '/refunds'
    ];

    const isSensitiveOperation = sensitiveOperations.includes(req.method) &&
      sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));

    if (isSensitiveOperation) {
      try {
        // Extract relevant data for audit
        const auditData = {
          userId: req.user?.id?.toString() || 'anonymous',
          userEmail: req.user?.email || 'anonymous',
          action: `${req.method} ${req.path}`,
          resource: req.path.split('/')[1] || 'unknown',
          resourceId: req.params.id || undefined,
          method: req.method,
          endpoint: req.path,
          statusCode,
          duration,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || undefined,
          requestBody: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
          responseStatus: statusCode >= 400 ? 'failure' : 'success',
          timestamp: new Date(),
          correlationId
        };

        await db.insert(billingAuditLogs).values(auditData);
      } catch (error) {
        logger.error('Failed to create billing audit entry', error as Error, { correlationId });
      }
    }
  });

  next();
};

// Function to sanitize request body for audit logging
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'bankAccount',
    'cardNumber',
    'cvv',
    'expiry',
    'mpesaPassKey',
    'consumerSecret',
    'webhookSecret'
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Handle nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    }
  }

  return sanitized;
}