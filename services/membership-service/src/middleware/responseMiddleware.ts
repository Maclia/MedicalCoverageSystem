import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Standardized API response middleware
 * Ensures consistent response format across all endpoints
 */
const logger = new WinstonLogger('membership-service');

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  correlationId?: string;
  error?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Middleware to standardize response format
 */
export function responseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req as any).correlationId;

  // Override res.json to standardize format
  const originalJson = res.json;
  res.json = function(data: any) {
    const standardizedResponse = standardizeResponse(data, res.statusCode, correlationId, req);
    return originalJson.call(this, standardizedResponse);
  };

  // Override res.send to handle non-JSON responses
  const originalSend = res.send;
  res.send = function(data: any) {
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
      return originalSend.call(this, data);
    }

    const standardizedResponse = standardizeResponse(data, res.statusCode, correlationId, req);
    return originalJson.call(this, standardizedResponse);
  };

  next();
}

/**
 * Standardize response data
 */
function standardizeResponse(data: any, statusCode: number, correlationId?: string, req?: Request): ApiResponse {
  const timestamp = new Date().toISOString();
  const success = statusCode >= 200 && statusCode < 300;

  // If already standardized response, just add missing fields
  if (data && typeof data === 'object' && 'success' in data) {
    return {
      ...data,
      timestamp: data.timestamp || timestamp,
      correlationId: data.correlationId || correlationId
    };
  }

  // Error responses
  if (!success) {
    return {
      success: false,
      error: typeof data === 'string' ? data : data?.message || 'Request failed',
      errors: Array.isArray(data?.errors) ? data.errors : (data?.error ? [data.error] : []),
      timestamp,
      correlationId,
      data: data?.data
    };
  }

  // Success responses with pagination
  if (data?.pagination) {
    return {
      success: true,
      data: data.data || data,
      pagination: {
        page: data.pagination.page || 1,
        limit: data.pagination.limit || 20,
        total: data.pagination.total || 0,
        totalPages: data.pagination.totalPages || 0
      },
      timestamp,
      correlationId,
      message: data.message
    };
  }

  // Success responses
  return {
    success: true,
    data,
    timestamp,
    correlationId,
    message: data?.message
  };
}

/**
 * Helper functions for common response types
 */
export class ResponseHelper {
  /**
   * Send success response
   */
  static success(res: Response, data?: any, message?: string, statusCode: number = 200): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send success response with pagination
   */
  static successWithPagination(
    res: Response,
    data: any[],
    pagination: any,
    message?: string,
    statusCode: number = 200
  ): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || data.length,
        totalPages: pagination.totalPages || Math.ceil(pagination.total / pagination.limit)
      },
      message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(res: Response, error: string | Error, statusCode: number = 500, errors?: string[]): void {
    const correlationId = (res.req as any)?.correlationId;
    const errorMessage = error instanceof Error ? error.message : error;

    const response: ApiResponse = {
      success: false,
      error: errorMessage,
      errors: errors || (error instanceof Error && error.message !== errorMessage ? [error.message] : []),
      timestamp: new Date().toISOString(),
      correlationId
    };

    res.status(statusCode).json(response);

    // Log error for debugging
    logger.error('API Error Response', {
      correlationId,
      statusCode,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      path: (res.req as any)?.path,
      method: (res.req as any)?.method
    });
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, errors: string[], statusCode: number = 400): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, resource: string = 'Resource'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: `${resource} not found`,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(404).json(response);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(401).json(response);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(403).json(response);
  }

  /**
   * Send conflict response
   */
  static conflict(res: Response, message: string = 'Conflict'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(409).json(response);
  }

  /**
   * Send rate limit exceeded response
   */
  static rateLimitExceeded(res: Response, retryAfter?: number): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
      correlationId
    };

    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }

    res.status(429).json(response);
  }

  /**
   * Send service unavailable response
   */
  static serviceUnavailable(res: Response, message: string = 'Service temporarily unavailable'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(503).json(response);
  }

  /**
   * Send created response
   */
  static created(res: Response, data?: any, message?: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message: message || 'Resource created successfully',
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(201).json(response);
  }

  /**
   * Send accepted response
   */
  static accepted(res: Response, data?: any, message?: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message: message || 'Request accepted for processing',
      timestamp: new Date().toISOString(),
      correlationId
    };
    res.status(202).json(response);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }
}

/**
 * Middleware to handle async route errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req as any).correlationId;

  // Log the error
  logger.error('Unhandled error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return ResponseHelper.validationError(res, [err.message]);
  }

  if (err.name === 'CastError') {
    return ResponseHelper.error(res, 'Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return ResponseHelper.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseHelper.unauthorized(res, 'Token expired');
  }

  if (err.name === 'MulterError') {
    if (err.message.includes('File too large')) {
      return ResponseHelper.error(res, 'File too large', 413);
    }
    return ResponseHelper.error(res, 'File upload error', 400);
  }

  // Default error
  ResponseHelper.error(res, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, 500);
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = (req as any).correlationId;
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    correlationId
  };
  res.status(404).json(response);
}

// Export ResponseHelper as default for convenience
export default ResponseHelper;