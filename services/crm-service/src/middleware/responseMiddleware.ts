import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Standardized API response middleware for CRM service
 * Ensures consistent response format across all endpoints
 */
const logger = new WinstonLogger('crm-service');

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
    leadId?: number;
    contactId?: number;
    companyId?: number;
    opportunityId?: number;
    activityId?: number;
    campaignId?: number;
    recordCount?: number;
    operation?: string;
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

  // Extract CRM-specific metadata from request or data
  const metadata: any = {};
  if (req?.params.id) {
    if (req.path.includes('/leads/')) metadata.leadId = parseInt(req.params.id);
    if (req.path.includes('/contacts/')) metadata.contactId = parseInt(req.params.id);
    if (req.path.includes('/companies/')) metadata.companyId = parseInt(req.params.id);
    if (req.path.includes('/opportunities/')) metadata.opportunityId = parseInt(req.params.id);
    if (req.path.includes('/activities/')) metadata.activityId = parseInt(req.params.id);
    if (req.path.includes('/email-campaigns/')) metadata.campaignId = parseInt(req.params.id);
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
export class CrmResponseHelper {
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
   * Send lead creation response
   */
  static leadCreated(res: Response, lead: any, message?: string): void {
    this.success(res, lead, message || 'Lead created successfully', 201, {
      leadId: lead.id,
      operation: 'lead_created'
    });
  }

  /**
   * Send lead conversion response
   */
  static leadConverted(res: Response, conversionResult: any, message?: string): void {
    this.success(res, conversionResult, message || 'Lead converted successfully', 200, {
      leadId: conversionResult.lead?.id,
      contactId: conversionResult.contact?.id,
      companyId: conversionResult.company?.id,
      operation: 'lead_converted'
    });
  }

  /**
   * Send contact creation response
   */
  static contactCreated(res: Response, contact: any, message?: string): void {
    this.success(res, contact, message || 'Contact created successfully', 201, {
      contactId: contact.id,
      companyId: contact.companyId,
      operation: 'contact_created'
    });
  }

  /**
   * Send company creation response
   */
  static companyCreated(res: Response, company: any, message?: string): void {
    this.success(res, company, message || 'Company created successfully', 201, {
      companyId: company.id,
      operation: 'company_created'
    });
  }

  /**
   * Send opportunity creation response
   */
  static opportunityCreated(res: Response, opportunity: any, message?: string): void {
    this.success(res, opportunity, message || 'Opportunity created successfully', 201, {
      opportunityId: opportunity.id,
      companyId: opportunity.companyId,
      operation: 'opportunity_created'
    });
  }

  /**
   * Send opportunity update response (including deal won/lost)
   */
  static opportunityUpdated(res: Response, opportunity: any, message?: string): void {
    this.success(res, opportunity, message || 'Opportunity updated successfully', 200, {
      opportunityId: opportunity.id,
      companyId: opportunity.companyId,
      operation: 'opportunity_updated',
      status: opportunity.status
    });
  }

  /**
   * Send activity creation response
   */
  static activityCreated(res: Response, activity: any, message?: string): void {
    this.success(res, activity, message || 'Activity created successfully', 201, {
      activityId: activity.id,
      operation: 'activity_created',
      activityType: activity.type
    });
  }

  /**
   * Send email campaign creation response
   */
  static emailCampaignCreated(res: Response, campaign: any, message?: string): void {
    this.success(res, campaign, message || 'Email campaign created successfully', 201, {
      campaignId: campaign.id,
      operation: 'email_campaign_created'
    });
  }

  /**
   * Send email campaign sent response
   */
  static emailCampaignSent(res: Response, campaign: any, recipientCount: number, message?: string): void {
    this.success(res, campaign, message || 'Email campaign sent successfully', 200, {
      campaignId: campaign.id,
      operation: 'email_campaign_sent',
      recordCount: recipientCount
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
   * Send dashboard metrics response
   */
  static dashboardMetrics(res: Response, metrics: any): void {
    this.success(res, metrics, 'Dashboard metrics retrieved successfully', 200, {
      operation: 'dashboard_metrics'
    });
  }

  /**
   * Send search results response
   */
  static searchResults(res: Response, results: any, resourceType: string, message?: string): void {
    this.successWithPagination(
      res,
      results[resourceType] || results.data || results,
      results.pagination,
      message || `${resourceType} search completed successfully`,
      200,
      {
        operation: `${resourceType}_search`,
        query: results.query
      }
    );
  }

  /**
   * Send export response
   */
  static exportComplete(res: Response, exportResult: any, exportType: string): void {
    this.success(res, exportResult, `${exportType} export completed successfully`, 200, {
      operation: `${exportType}_export`,
      recordCount: exportResult.recordCount
    });
  }

  /**
   * Send import response
   */
  static importComplete(res: Response, importResult: any, importType: string): void {
    this.success(res, importResult, `${importType} import completed successfully`, 200, {
      operation: `${importType}_import`,
      recordCount: importResult.importedCount
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
    logger.error('CRM API Error Response', {
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
  logger.error('CRM Unhandled error', {
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
    return CrmResponseHelper.validationError(res, [err.message]);
  }

  if (err.name === 'CastError') {
    return CrmResponseHelper.error(res, 'Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return CrmResponseHelper.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return CrmResponseHelper.error(res, 'Token expired', 401);
  }

  if (err.name === 'MulterError') {
    if (err.message.includes('File too large')) {
      return CrmResponseHelper.error(res, 'File too large', 413);
    }
    return CrmResponseHelper.error(res, 'File upload error', 400);
  }

  // Default error
  CrmResponseHelper.error(res,
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
export default CrmResponseHelper;