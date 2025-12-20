import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger();

// Standard response format
export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    version?: string;
    timestamp?: string;
  };
  correlationId?: string;
}

// Success response helper
export const createSuccessResponse = <T>(
  data: T,
  pagination?: any,
  correlationId?: string
): StandardResponse<T> => {
  return {
    success: true,
    data,
    meta: {
      pagination,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    },
    correlationId
  };
};

// Error response helper
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any,
  correlationId?: string
): StandardResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      version: '1.0.0',
      timestamp: new Date().toISOString()
    },
    correlationId
  };
};

// Response standardization middleware
export const standardizeResponse = (req: Request, res: Response, next: NextFunction) => {
  // Override res.json to standardize responses
  const originalJson = res.json;

  res.json = function(body: any, statusCode: number = res.statusCode) {
    const correlationId = req.correlationId;

    // Don't double-standardize already standardized responses
    if (body && typeof body === 'object' && 'success' in body) {
      // Add correlation ID if not present
      if (!body.correlationId && correlationId) {
        body.correlationId = correlationId;
      }
      return originalJson.call(this, body);
    }

    // Standardize successful responses
    if (statusCode >= 200 && statusCode < 300) {
      const standardResponse = createSuccessResponse(body, undefined, correlationId);
      return originalJson.call(this, standardResponse);
    }

    // Standardize error responses
    const standardResponse = createErrorResponse(
      'UNKNOWN_ERROR',
      body?.message || 'An unexpected error occurred',
      body,
      correlationId
    );
    return originalJson.call(this, standardResponse);
  };

  // Override res.status to capture status code
  const originalStatus = res.status;
  res.status = function(code: number) {
    res.statusCode = code;
    return originalStatus.call(this, code);
  };

  next();
};

// Pagination helper middleware
export const handlePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Validate pagination parameters
  if (page < 1) {
    return res.status(400).json(
      createErrorResponse(
        'INVALID_PAGINATION',
        'Page must be greater than 0',
        { page },
        req.correlationId
      )
    );
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json(
      createErrorResponse(
        'INVALID_PAGINATION',
        'Limit must be between 1 and 100',
        { limit },
        req.correlationId
      )
    );
  }

  // Add pagination info to request
  (req as any).pagination = {
    page,
    limit,
    offset
  };

  next();
};

// Add pagination info to successful responses
export const addPaginationToResponse = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;

  res.json = function(body: any) {
    // If this is a successful response with an array and we have pagination info
    if (Array.isArray(body) && (req as any).pagination) {
      const { page, limit } = (req as any).pagination;
      const total = body.length;
      const totalPages = Math.ceil(total / limit);

      const paginatedResponse = createSuccessResponse(
        body,
        {
          page,
          limit,
          total,
          totalPages
        },
        req.correlationId
      );

      return originalJson.call(this, paginatedResponse);
    }

    return originalJson.call(this, body);
  };

  next();
};

// Response compression middleware (for large responses)
export const compressLargeResponses = (req: Request, res: Response, next: NextFunction) => {
  // Add compression header for large responses
  const originalJson = res.json;

  res.json = function(body: any) {
    const responseSize = JSON.stringify(body).length;

    // Compress responses larger than 1KB
    if (responseSize > 1024) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('X-Content-Length', responseSize.toString());
    }

    return originalJson.call(this, body);
  };

  next();
};

// Cache control middleware
export const addCacheControl = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add cache control headers for GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
    }

    next();
  };
};

// Add security headers to responses
export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add content security policy if enabled
  if (process.env.ENABLE_CSP !== 'false') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );
  }

  next();
};

// API versioning middleware
export const addApiVersion = (version: string = 'v1') => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('API-Version', version);
    next();
  };
};

// Request timing middleware
export const addRequestTiming = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Add timing info to response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
  });

  next();
};

// Standard error response middleware
export const standardErrorResponse = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.correlationId;

  logger.error('Request error', err, {
    method: req.method,
    url: req.url,
    correlationId
  });

  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';

  if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
  }

  if (err.code) {
    errorCode = err.code;
  }

  if (err.message) {
    message = err.message;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  }

  const errorResponse = createErrorResponse(
    errorCode,
    message,
    process.env.NODE_ENV === 'development' ? err.stack : undefined,
    correlationId
  );

  res.status(statusCode).json(errorResponse);
};