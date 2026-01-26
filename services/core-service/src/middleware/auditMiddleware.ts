import { Request, Response, NextFunction } from 'express';
import { generateCorrelationId, createLogger } from '../utils/logger';
import { auditService } from '../services/AuditService';

// Extend Request interface to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: any;
    }
  }
}

/**
 * Middleware to add correlation ID to all requests
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = generateCorrelationId();
  req.correlationId = correlationId;

  // Add correlation ID to response headers for client-side tracking
  res.setHeader('X-Correlation-ID', correlationId);

  const logger = createLogger(correlationId);
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log response when it finishes
  res.on('finish', () => {
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    });
  });

  next();
};

/**
 * Middleware to audit data access
 */
export const auditDataAccessMiddleware = (resourceType: string, resourceIdParam = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        const resourceId = req.params[resourceIdParam];

        await auditService.logDataAccess(
          req.user.id,
          resourceType,
          resourceId,
          req.method,
          req.ip,
          req.get('User-Agent')
        );
      }
      next();
    } catch (error) {
      // Audit logging should not break the request
      const logger = createLogger(req.correlationId);
      logger.error('Audit middleware error', error as Error);
      next();
    }
  };
};

/**
 * Middleware to audit data modifications
 */
export const auditDataModificationMiddleware = (resourceType: string, resourceIdParam = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original data if this is an update operation
    let originalData: any = null;

    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // TODO: Get original data from database based on resource type and ID
        // This would require injecting the appropriate service/repository
        // For now, we'll log the modification without before/after comparison
      } catch (error) {
        // Continue without original data
      }
    }

    // Override res.json to capture response data for audit logging
    const originalJson = res.json;
    res.json = function(data: any) {
      // Log the modification asynchronously
      setImmediate(async () => {
        try {
          if (req.user && (res.statusCode >= 200 && res.statusCode < 300)) {
            const action = req.method === 'POST' ? 'CREATE' :
                         req.method === 'DELETE' ? 'DELETE' : 'UPDATE';

            const resourceId = req.params[resourceIdParam] ||
                             (data.id ? data.id.toString() : undefined);

            await auditService.logDataModification(
              req.user.id,
              action,
              resourceType,
              resourceId,
              originalData,
              data,
              undefined, // TODO: Calculate specific field changes
              req.ip,
              req.get('User-Agent')
            );
          }
        } catch (error) {
          // Audit logging should not break the response
          const logger = createLogger(req.correlationId);
          logger.error('Failed to log data modification', error as Error);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to audit financial transactions
 */
export const auditFinancialTransactionMiddleware = (transactionType: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Override res.json to capture successful financial transaction
    const originalJson = res.json;
    res.json = function(data: any) {
      // Log the financial transaction asynchronously
      setImmediate(async () => {
        try {
          if (req.user && (res.statusCode >= 200 && res.statusCode < 300)) {
            const resourceId = data.id ? data.id.toString() : undefined;
            const amount = data.amount || req.body.amount;
            const currency = data.currency || req.body.currency || 'USD';
            const status = data.status || 'completed';

            await auditService.logFinancialTransaction(
              req.user.id,
              transactionType,
              resourceType,
              resourceId,
              amount,
              currency,
              status,
              req.ip,
              req.get('User-Agent')
            );
          }
        } catch (error) {
          // Audit logging should not break the response
          const logger = createLogger(req.correlationId);
          logger.error('Failed to log financial transaction', error as Error);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to audit configuration changes
 */
export const auditConfigurationMiddleware = (configurationType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let originalData: any = null;

    // For configuration updates, try to get current configuration
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // TODO: Get current configuration from database
        // This would require injecting the appropriate service
      } catch (error) {
        // Continue without original data
      }
    }

    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function(data: any) {
      // Log the configuration change asynchronously
      setImmediate(async () => {
        try {
          if (req.user && (res.statusCode >= 200 && res.statusCode < 300)) {
            await auditService.logConfigurationChange(
              req.user.id,
              configurationType,
              originalData,
              req.body,
              req.ip,
              req.get('User-Agent')
            );
          }
        } catch (error) {
          // Audit logging should not break the response
          const logger = createLogger(req.correlationId);
          logger.error('Failed to log configuration change', error as Error);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Request timing middleware for performance monitoring
 */
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  next();
};

/**
 * Error audit middleware
 */
export const errorAuditMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const logger = createLogger(req.correlationId);

  // Log the error with context
  logger.error('Request error', err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // If this is a security-related error, create additional audit entry
  if (err.message.includes('Unauthorized') ||
      err.message.includes('Forbidden') ||
      err.message.includes('Invalid credentials')) {

    auditService.logAuthEvent(
      'LOGIN_FAILED',
      req.user?.id,
      undefined,
      req.ip,
      req.get('User-Agent'),
      err.message
    ).catch(auditError => {
      logger.error('Failed to log security error to audit', auditError);
    });
  }

  next(err);
};