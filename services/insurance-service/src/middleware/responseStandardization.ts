import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { ResponseFactory, ErrorCodes } from '../utils/api-standardization';

const logger = createLogger();

export const standardizeResponse = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Override res.json to standardize responses
    const originalJson = res.json;
    const originalStatus = res.status;

    res.status = function(code: number) {
      res.statusCode = code;
      return originalStatus.call(this, code);
    };

    res.json = function(body: any) {
      const correlationId = req.correlationId;
      const processingTime = Date.now() - startTime;

      // Don't double-standardize already standardized responses
      if (body && typeof body === 'object' && 'success' in body) {
        // Add service info and processing time
        if (!body.meta) body.meta = {};
        body.meta.requestId = body.meta.requestId || randomUUID();
        body.meta.processingTime = processingTime;
        body.meta.service = serviceName;
        body.correlationId = body.correlationId || correlationId;

        return originalJson.call(this, body);
      }

      // Determine if this is an error response
      const isError = res.statusCode >= 400;

      if (isError) {
        // Standardize error response
        const errorResponse = ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          body?.message || 'An unexpected error occurred',
          body,
          correlationId,
          {
            requestId: randomUUID(),
            processingTime,
            service: serviceName
          }
        );

        return originalJson.call(this, errorResponse);
      } else {
        // Standardize success response
        const successResponse = ResponseFactory.createSuccessResponse(
          body,
          undefined,
          correlationId,
          {
            requestId: randomUUID(),
            processingTime,
            service: serviceName
          }
        );

        return originalJson.call(this, successResponse);
      }
    };

    // Helper methods for standard responses
    res.success = (data: any, meta?: any) => {
      return res.json(ResponseFactory.createSuccessResponse(
        data,
        undefined,
        req.correlationId,
        {
          requestId: randomUUID(),
          processingTime: Date.now() - startTime,
          service: serviceName,
          ...meta
        }
      ));
    };

    res.paginated = (data: any[], page: number, limit: number, total: number, meta?: any) => {
      return res.json(ResponseFactory.createPaginatedResponse(
        data,
        page,
        limit,
        total,
        req.correlationId,
        {
          requestId: randomUUID(),
          processingTime: Date.now() - startTime,
          service: serviceName,
          ...meta
        }
      ));
    };

    res.created = (data: any, location?: string) => {
      res.status(201);
      return res.json(ResponseFactory.createSuccessResponse(
        data,
        undefined,
        req.correlationId,
        {
          requestId: randomUUID(),
          processingTime: Date.now() - startTime,
          service: serviceName,
          location
        }
      ));
    };

    res.noContent = () => {
      res.status(204);
      return res.json(ResponseFactory.createSuccessResponse(
        null,
        undefined,
        req.correlationId,
        {
          requestId: randomUUID(),
          processingTime: Date.now() - startTime,
          service: serviceName
        }
      ));
    };

    res.error = (code: string, message: string, details?: any, statusCode?: number) => {
      const status = statusCode || 400;
      res.status(status);
      return res.json(ResponseFactory.createErrorResponse(
        code,
        message,
        details,
        req.correlationId,
        {
          requestId: randomUUID(),
          processingTime: Date.now() - startTime,
          service: serviceName
        }
      ));
    };

    next();
  };
};

export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add content security policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  next();
};

export const addApiVersion = (version: string = 'v1') => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('API-Version', version);
    next();
  };
};

export const addRequestTiming = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Add timing info to response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
  });

  next();
};

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
  let errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
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
    errorCode = ErrorCodes.VALIDATION_ERROR;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = ErrorCodes.UNAUTHORIZED;
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = ErrorCodes.FORBIDDEN;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = ErrorCodes.NOT_FOUND;
  }

  const errorResponse = ResponseFactory.createErrorResponse(
    errorCode,
    message,
    process.env.NODE_ENV === 'development' ? err.stack : undefined,
    correlationId
  );

  res.status(statusCode).json(errorResponse);
};