import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

// Standard Error Codes
const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};

// Response Factory
const ResponseFactory = {
  createSuccessResponse: (data: any, message?: string, correlationId?: string) => ({
    success: true,
    data,
    message: message || 'Operation completed successfully',
    correlationId,
    timestamp: new Date().toISOString()
  }),

  createErrorResponse: (errorCode: string, message: string, details?: any, correlationId?: string) => ({
    success: false,
    error: {
      code: errorCode,
      message,
      details
    },
    correlationId,
    timestamp: new Date().toISOString()
  }),

  createPaginatedResponse: (data: any[], page: number, limit: number, total: number, correlationId?: string, message?: string) => ({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    message: message || 'Data retrieved successfully',
    correlationId,
    timestamp: new Date().toISOString()
  })
};

export const responseStandardizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original methods
  const originalJson = res.json;
  const originalStatus = res.status;

  // Override status method to capture status code
  res.status = function(code: number) {
    res.statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override json method to standardize responses
  res.json = function(data: any) {
    // If response is already standardized, return as-is
    if (data && typeof data === 'object' && (data.success !== undefined || data.error !== undefined)) {
      return originalJson.call(this, data);
    }

    // For successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const standardizedResponse = ResponseFactory.createSuccessResponse(
        data,
        undefined,
        (req as any).correlationId
      );
      return originalJson.call(this, standardizedResponse);
    }

    // For error responses (4xx, 5xx status codes)
    if (res.statusCode >= 400) {
      let errorCode: string = ErrorCodes.INTERNAL_SERVER_ERROR;
      let message = 'An error occurred';

      if (res.statusCode === 400) {
        errorCode = ErrorCodes.BAD_REQUEST;
        message = 'Bad request';
      } else if (res.statusCode === 401) {
        errorCode = ErrorCodes.UNAUTHORIZED;
        message = 'Unauthorized';
      } else if (res.statusCode === 403) {
        errorCode = ErrorCodes.FORBIDDEN;
        message = 'Forbidden';
      } else if (res.statusCode === 404) {
        errorCode = ErrorCodes.NOT_FOUND;
        message = 'Resource not found';
      } else if (res.statusCode === 409) {
        errorCode = ErrorCodes.CONFLICT;
        message = 'Conflict';
      } else if (res.statusCode === 422) {
        errorCode = ErrorCodes.VALIDATION_ERROR;
        message = 'Validation error';
      }

      const standardizedError = ResponseFactory.createErrorResponse(
        errorCode,
        message,
        data,
        (req as any).correlationId
      );

      return originalJson.call(this, standardizedError);
    }

    // Default case - treat as success
    const standardizedResponse = ResponseFactory.createSuccessResponse(
      data,
      undefined,
      (req as any).correlationId
    );
    return originalJson.call(this, standardizedResponse);
  };

  // Add helper method for success responses
  (res as any).success = function(data?: any, message?: string) {
    const response = ResponseFactory.createSuccessResponse(data, message, (req as any).correlationId);
    return originalJson.call(this, response);
  };

  // Add helper method for error responses
  (res as any).error = function(errorCode: string, message: string, details?: any) {
    const response = ResponseFactory.createErrorResponse(errorCode, message, details, (req as any).correlationId);
    res.statusCode = getStatusCodeFromError(errorCode);
    return originalJson.call(this, response);
  };

  // Add helper method for paginated responses
  (res as any).paginated = function(data: any[], page: number, limit: number, total: number, message?: string) {
    const response = ResponseFactory.createPaginatedResponse(data, page, limit, total, (req as any).correlationId, message);
    return originalJson.call(this, response);
  };

  next();
};

// Helper function to map error codes to HTTP status codes
function getStatusCodeFromError(errorCode: string): number {
  switch (errorCode) {
    case ErrorCodes.BAD_REQUEST:
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
      return 401;
    case ErrorCodes.FORBIDDEN:
      return 403;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.CONFLICT:
      return 409;
    case ErrorCodes.UNPROCESSABLE_ENTITY:
      return 422;
    case ErrorCodes.TOO_MANY_REQUESTS:
      return 429;
    case ErrorCodes.INTERNAL_SERVER_ERROR:
    default:
      return 500;
  }
}

// Error handling middleware
export const errorHandlerMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId || 'unknown';

  logger.error('Unhandled error in request', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    correlationId
  });

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = ResponseFactory.createErrorResponse(
    ErrorCodes.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    isDevelopment ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined,
    correlationId
  );

  res.status(500).json(errorResponse);
};

// 404 handler middleware
export const notFoundHandlerMiddleware = (req: Request, res: Response) => {
  const errorResponse = ResponseFactory.createErrorResponse(
    ErrorCodes.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    {
      method: req.method,
      path: req.path
    },
    (req as any).correlationId
  );

  res.status(404).json(errorResponse);
};