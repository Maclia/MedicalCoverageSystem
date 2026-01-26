import { Request, Response, NextFunction } from 'express';
import { ErrorHandler, AppError } from '../utils/errors';
import { auditService } from '../services/AuditService';
import { createLogger } from '../utils/logger';

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const logger = createLogger(req.correlationId);

  // Normalize the error
  const appError = ErrorHandler.handleError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Create standardized error response
  const errorResponse = ErrorHandler.createErrorResponse(appError, req.correlationId);

  // Log security-related errors to audit service
  if (appError instanceof AppError && (
    appError.statusCode === 401 || // Authentication errors
    appError.statusCode === 403 || // Authorization errors
    appError.code === 'SECURITY_VIOLATION' ||
    appError.code === 'RATE_LIMIT_EXCEEDED'
  )) {
    try {
      await auditService.logAuthEvent(
        'LOGIN_FAILED', // Generic auth failure
        req.user?.id,
        undefined,
        req.ip,
        req.get('User-Agent'),
        appError.message
      );
    } catch (auditError) {
      logger.error('Failed to log security error to audit service', auditError);
    }
  }

  // Log critical errors for monitoring
  if (appError.statusCode >= 500) {
    logger.error('Critical error occurred', appError, {
      url: req.url,
      method: req.method,
      userId: req.user?.id
    });
  }

  // Set appropriate headers
  if (appError.statusCode === 429) {
    const retryAfter = appError.details?.retryAfter || 60;
    res.setHeader('Retry-After', retryAfter);
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const logger = createLogger(req.correlationId);

  const error = ErrorHandler.handleError(
    new Error(`Route ${req.method} ${req.path} not found`),
    { method: req.method, url: req.path }
  );

  const errorResponse = ErrorHandler.createErrorResponse(error, req.correlationId);

  logger.warn('Route not found', {
    method: req.method,
    url: req.path,
    ip: req.ip
  });

  res.status(404).json(errorResponse);
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  const logger = createLogger();

  const error = ErrorHandler.handleError(
    new Error(`Unhandled promise rejection: ${reason}`),
    { reason, promise }
  );

  logger.error('Unhandled promise rejection', error, { reason });

  // In production, don't crash the process
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // In development, exit to surface the issue
  process.exit(1);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (error: Error): void => {
  const logger = createLogger();

  const appError = ErrorHandler.handleError(error, {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  logger.error('Uncaught exception', appError);

  // Attempt graceful shutdown
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
};

/**
 * Cleanup error handlers (for graceful shutdown)
 */
export const cleanupErrorHandlers = (): void => {
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
};