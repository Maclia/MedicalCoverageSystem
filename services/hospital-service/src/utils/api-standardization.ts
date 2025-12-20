import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Standard response interface for all services
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    version?: string;
    timestamp: string;
    requestId?: string;
    processingTime?: number;
  };
  correlationId?: string;
}

// Success response factory
export class ResponseFactory {
  static createSuccessResponse<T>(
    data: T,
    pagination?: StandardApiResponse['meta']['pagination'],
    correlationId?: string,
    meta?: Omit<StandardApiResponse['meta'], 'pagination' | 'timestamp'>
  ): StandardApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        pagination,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        ...meta
      },
      correlationId
    };
  }

  static createErrorResponse(
    code: string,
    message: string,
    details?: any,
    correlationId?: string,
    meta?: Omit<StandardApiResponse['meta'], 'timestamp'>
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        field: details?.field
      },
      meta: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        ...meta
      },
      correlationId
    };
  }

  static createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    correlationId?: string,
    meta?: Omit<StandardApiResponse['meta'], 'pagination' | 'timestamp'>
  ): StandardApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    return this.createSuccessResponse(
      data,
      {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      correlationId,
      meta
    );
  }

  static createCreatedResponse<T>(
    data: T,
    correlationId?: string,
    location?: string
  ): StandardApiResponse<T> {
    return this.createSuccessResponse(
      data,
      undefined,
      correlationId,
      {
        requestId: randomUUID(),
        ...(location && { location })
      }
    );
  }

  static createNoContentResponse(correlationId?: string): StandardApiResponse {
    return {
      success: true,
      meta: {
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      correlationId
    };
  }
}

// HTTP status codes with standard error codes
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',

  // Business logic errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  DEPENDENCY_FAILURE: 'DEPENDENCY_FAILURE',

  // Authentication/Authorization
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_AUTHENTICATION: 'INSUFFICIENT_AUTHENTICATION',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  // Data errors
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  REFERENCED_RESOURCE_NOT_FOUND: 'REFERENCED_RESOURCE_NOT_FOUND',

  // Integration errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Data validation
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FIELD_FORMAT: 'INVALID_FIELD_FORMAT',
  INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  FIELD_TOO_SHORT: 'FIELD_TOO_SHORT'
} as const;

// HTTP status code mappings
export const HttpStatusCodes = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Standard error messages
export const ErrorMessages = {
  [ErrorCodes.BAD_REQUEST]: 'The request is invalid',
  [ErrorCodes.UNAUTHORIZED]: 'Authentication is required',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.VALIDATION_ERROR]: 'The request data is invalid',
  [ErrorCodes.CONFLICT]: 'The request conflicts with existing data',
  [ErrorCodes.TOO_MANY_REQUESTS]: 'Too many requests, please try again later',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable',
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: 'The request violates business rules',
  [ErrorCodes.INVALID_TOKEN]: 'The provided token is invalid',
  [ErrorCodes.TOKEN_EXPIRED]: 'The provided token has expired',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded, please try again later'
} as const;

// Response standardization middleware
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
        body.meta.requestId = body.meta.requestId || crypto.randomUUID();
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
          body?.message || ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
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
      res.status(HttpStatusCodes.CREATED);
      return res.json(ResponseFactory.createCreatedResponse(
        data,
        req.correlationId,
        location
      ));
    };

    res.noContent = () => {
      res.status(HttpStatusCodes.NO_CONTENT);
      return res.json(ResponseFactory.createNoContentResponse(req.correlationId));
    };

    res.error = (code: string, message: string, details?: any, statusCode?: number) => {
      const status = statusCode || HttpStatusCodes.BAD_REQUEST;
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

// Validation error helper
export const createValidationErrorResponse = (
  errors: Array<{ field: string; message: string; value?: any }>,
  correlationId?: string
): StandardApiResponse => {
  return ResponseFactory.createErrorResponse(
    ErrorCodes.VALIDATION_ERROR,
    'Request validation failed',
    {
      errors: errors.map(err => ({
        field: err.field,
        message: err.message,
        value: err.value ? String(err.value) : undefined
      }))
    },
    correlationId
  );
};

// Business rule error helper
export const createBusinessRuleErrorResponse = (
  rule: string,
  message: string,
  details?: any,
  correlationId?: string
): StandardApiResponse => {
  return ResponseFactory.createErrorResponse(
    ErrorCodes.BUSINESS_RULE_VIOLATION,
    message,
    {
      rule,
      ...details
    },
    correlationId
  );
};

// Service unavailable error helper
export const createServiceUnavailableResponse = (
  serviceName: string,
  correlationId?: string
): StandardApiResponse => {
  return ResponseFactory.createErrorResponse(
    ErrorCodes.SERVICE_UNAVAILABLE,
    `${serviceName} service is temporarily unavailable`,
    { service: serviceName },
    correlationId
  );
};

// Rate limit error helper
export const createRateLimitResponse = (
  retryAfter?: number,
  correlationId?: string
): StandardApiResponse => {
  return ResponseFactory.createErrorResponse(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded, please try again later',
    { retryAfter },
    correlationId
  );
};

// Type guard to check if response is standardized
export function isStandardResponse(obj: any): obj is StandardApiResponse {
  return obj && typeof obj === 'object' && 'success' in obj;
}

// Helper to extract data from standardized response
export function extractResponseData<T = any>(response: StandardApiResponse<T>): T | null {
  return response.success ? (response.data as T) : null;
}

// Helper to extract error from standardized response
export function extractResponseError(response: StandardApiResponse): StandardApiResponse['error'] | null {
  return !response.success ? response.error : null;
}

export default {
  ResponseFactory,
  ErrorCodes,
  HttpStatusCodes,
  ErrorMessages,
  standardizeResponse,
  createValidationErrorResponse,
  createBusinessRuleErrorResponse,
  createServiceUnavailableResponse,
  createRateLimitResponse,
  isStandardResponse,
  extractResponseData,
  extractResponseError
};