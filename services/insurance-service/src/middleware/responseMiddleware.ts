import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger.js';

/**
 * Standardized API response middleware for Insurance service
 * Ensures consistent response format across all endpoints
 * Standard implementation used across all modern services
 */
const logger = new WinstonLogger('insurance-service');

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
  metadata?: {
    schemeId?: number;
    benefitId?: number;
    companyId?: number;
    memberId?: number;
    coverageId?: number;
    claimId?: number;
    policyId?: number;
    recordCount?: number;
    operation?: string;
    rule?: string;
    service?: string;
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

  // Extract Insurance-specific metadata from request or data
  const metadata: any = {};
  if (req?.params.id) {
    if (req.path.includes('/schemes/')) metadata.schemeId = parseInt(req.params.id);
    if (req.path.includes('/benefits/')) metadata.benefitId = parseInt(req.params.id);
    if (req.path.includes('/companies/')) metadata.companyId = parseInt(req.params.id);
    if (req.path.includes('/members/')) metadata.memberId = parseInt(req.params.id);
    if (req.path.includes('/coverage/')) metadata.coverageId = parseInt(req.params.id);
    if (req.path.includes('/policies/')) metadata.policyId = parseInt(req.params.id);
  }

  if (data?.pagination) {
    metadata.recordCount = data.pagination.total;
  }

  if (data?.operation) {
    metadata.operation = data.operation;
  }

  // If already standardized response, just add missing fields
  if (data && typeof data === 'object' && 'success' in data) {
    return {
      ...data,
      timestamp: data.timestamp || timestamp,
      correlationId: data.correlationId || correlationId,
      metadata: { ...metadata, ...data.metadata }
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
      metadata,
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
      metadata,
      message: data.message
    };
  }

  // Success responses
  return {
    success: true,
    data,
    timestamp,
    correlationId,
    metadata,
    message: data?.message
  };
}

/**
 * Helper functions for common response types
 */
export class InsuranceResponseHelper {
  /**
   * Send success response
   */
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

  /**
   * Send success response with pagination
   */
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

  /**
   * Send scheme creation response
   */
  static schemeCreated(res: Response, scheme: any, message?: string): void {
    this.success(res, scheme, message || 'Insurance scheme created successfully', 201, {
      schemeId: scheme.id,
      operation: 'scheme_created'
    });
  }

  /**
   * Send benefit creation response
   */
  static benefitCreated(res: Response, benefit: any, message?: string): void {
    this.success(res, benefit, message || 'Benefit created successfully', 201, {
      benefitId: benefit.id,
      schemeId: benefit.schemeId,
      operation: 'benefit_created'
    });
  }

  /**
   * Send company benefit assignment response
   */
  static companyBenefitAssigned(res: Response, assignment: any, message?: string): void {
    this.success(res, assignment, message || 'Benefit assigned to company successfully', 200, {
      companyId: assignment.companyId,
      benefitId: assignment.benefitId,
      operation: 'company_benefit_assigned'
    });
  }

  /**
   * Send coverage calculation response
   */
  static coverageCalculated(res: Response, coverageResult: any, message?: string): void {
    this.success(res, coverageResult, message || 'Coverage calculated successfully', 200, {
      schemeId: coverageResult.schemeId,
      companyId: coverageResult.companyId,
      operation: 'coverage_calculated'
    });
  }

  /**
   * Send eligibility check response
   */
  static eligibilityChecked(res: Response, eligibilityResult: any, message?: string): void {
    this.success(res, eligibilityResult, message || 'Eligibility check completed', 200, {
      memberId: eligibilityResult.memberId,
      schemeId: eligibilityResult.schemeId,
      operation: 'eligibility_check'
    });
  }

  /**
   * Send bulk operation response
   */
  static bulkOperation(res: Response, result: any, operationType: string, message?: string): void {
    this.success(res, result, message || `Bulk ${operationType} completed successfully`, 200, {
      operation: `bulk_${operationType}`,
      recordCount: result.updatedCount || result.processedCount || 0
    });
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
    logger.error('Insurance API Error Response', {
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
   * Send business rule violation response
   */
  static businessRuleViolation(res: Response, message: string, rule?: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        operation: 'business_rule_violation',
        rule
      }
    };
    res.status(422).json(response);
  }

  /**
   * Send external service error response
   */
  static externalServiceError(res: Response, service: string, message: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: `External service error: ${service}`,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        operation: 'external_service_error',
        service
      }
    };
    res.status(502).json(response);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send accepted response (for async operations)
   */
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
  logger.error('Insurance Unhandled error', {
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
    return InsuranceResponseHelper.validationError(res, [err.message]);
  }

  if (err.name === 'CastError') {
    return InsuranceResponseHelper.error(res, 'Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return InsuranceResponseHelper.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return InsuranceResponseHelper.error(res, 'Token expired', 401);
  }

  if (err.name === 'MulterError') {
    if (err.message.includes('File too large')) {
      return InsuranceResponseHelper.error(res, 'File too large', 413);
    }
    return InsuranceResponseHelper.error(res, 'File upload error', 400);
  }

  // Default error
  InsuranceResponseHelper.error(res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
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
export default InsuranceResponseHelper;