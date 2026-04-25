import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('wellness-service');

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
  metadata?: {
    wellnessId?: number;
    programId?: number;
    memberId?: number;
    recordCount?: number;
    operation?: string;
    service?: string;
  };
}

export function responseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req as any).correlationId;

  const originalJson = res.json;
  res.json = function(data: any) {
    const standardizedResponse = standardizeResponse(data, res.statusCode, correlationId, req);
    return originalJson.call(this, standardizedResponse);
  };

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

function standardizeResponse(data: any, statusCode: number, correlationId?: string, req?: Request): ApiResponse {
  const timestamp = new Date().toISOString();
  const success = statusCode >= 200 && statusCode < 300;

  const metadata: any = {};
  if (req?.params.id) {
    if (req.path.includes('/programs/')) metadata.programId = parseInt(req.params.id);
    if (req.path.includes('/wellness/')) metadata.wellnessId = parseInt(req.params.id);
    if (req.path.includes('/members/')) metadata.memberId = parseInt(req.params.id);
  }

  if (data?.pagination) {
    metadata.recordCount = data.pagination.total;
  }

  if (data?.operation) {
    metadata.operation = data.operation;
  }

  if (data && typeof data === 'object' && 'success' in data) {
    return {
      ...data,
      timestamp: data.timestamp || timestamp,
      correlationId: data.correlationId || correlationId,
      metadata: { ...metadata, ...data.metadata }
    };
  }

  if (!success) {
    return {
      success: false,
      error: typeof data === 'string' ? data : data?.message || 'Request failed',
      errors: Array.isArray(data?.errors) ? data.errors : (data?.error ? [data.error] : []),
      timestamp,
      correlationId,
      metadata,
      data: data?.data
    };
  }

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
      metadata,
      message: data.message
    };
  }

  return {
    success: true,
    data,
    timestamp,
    correlationId,
    metadata,
    message: data?.message
  };
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class WellnessResponseHelper {
  static success(res: Response, data?: any, message?: string, statusCode: number = 200, metadata?: any): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata
    };
    res.status(statusCode).json(response);
  }

  static successWithPagination(
    res: Response,
    data: any[],
    pagination: any,
    message?: string,
    statusCode: number = 200,
    metadata?: any
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
      correlationId,
      metadata: {
        ...metadata,
        recordCount: pagination.total || data.length
      }
    };
    res.status(statusCode).json(response);
  }

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

    logger.error('Wellness API Error Response', {
      correlationId,
      statusCode,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      path: (res.req as any)?.path,
      method: (res.req as any)?.method
    });
  }

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

  static noContent(res: Response): void {
    res.status(204).send();
  }

  static accepted(res: Response, data?: any, message?: string, metadata?: any): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message: message || 'Request accepted for processing',
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        operation: 'async_processing',
        ...metadata
      }
    };
    res.status(202).json(response);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req as any).correlationId;

  logger.error('Wellness Unhandled error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (err.name === 'ValidationError') {
    return WellnessResponseHelper.validationError(res, [err.message]);
  }

  if (err.name === 'CastError') {
    return WellnessResponseHelper.error(res, 'Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return WellnessResponseHelper.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return WellnessResponseHelper.error(res, 'Token expired', 401);
  }

  if (err.name === 'MulterError') {
    if (err.message.includes('File too large')) {
      return WellnessResponseHelper.error(res, 'File too large', 413);
    }
    return WellnessResponseHelper.error(res, 'File upload error', 400);
  }

  WellnessResponseHelper.error(res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
}

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

export default WellnessResponseHelper;
