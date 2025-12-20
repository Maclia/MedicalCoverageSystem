import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

/**
 * Standardized API response middleware for Finance Service
 * Ensures consistent response format with financial compliance features
 */
const logger = new WinstonLogger('finance-service');

/**
 * Standard API response interface with financial metadata
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
    invoiceId?: number;
    paymentId?: number;
    commissionId?: number;
    transactionId?: string;
    amount?: number;
    currency?: string;
    financialEvent?: string;
    auditTrail?: boolean;
    complianceLevel?: string;
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
 * Standardize response data with financial compliance
 */
function standardizeResponse(data: any, statusCode: number, correlationId?: string, req?: Request): ApiResponse {
  const timestamp = new Date().toISOString();
  const success = statusCode >= 200 && statusCode < 300;

  // Extract financial-specific metadata from request or data
  const metadata: any = {};
  if (req?.params.id) {
    if (req.path.includes('/invoices/')) metadata.invoiceId = parseInt(req.params.id);
    if (req.path.includes('/payments/')) metadata.paymentId = parseInt(req.params.id);
    if (req.path.includes('/commissions/')) metadata.commissionId = parseInt(req.params.id);
  }

  if (data?.transactionId) metadata.transactionId = data.transactionId;
  if (data?.amount) metadata.amount = data.amount;
  if (data?.currency) metadata.currency = data.currency;
  if (req?.path.includes('/invoices') || req?.path.includes('/payments') || req?.path.includes('/commissions')) {
    metadata.auditTrail = true;
    metadata.complianceLevel = 'financial';
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
      metadata: { ...metadata, complianceLevel: 'error' }
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
      metadata: { ...metadata, recordCount: data.pagination.total || 0 },
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
 * Helper functions for common financial response types
 */
export class FinanceResponseHelper {
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
      metadata: { auditTrail: true, complianceLevel: 'financial', ...metadata }
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
        auditTrail: true,
        complianceLevel: 'financial',
        recordCount: pagination.total || data.length,
        ...metadata
      }
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send invoice creation response
   */
  static invoiceCreated(res: Response, invoice: any, message?: string): void {
    this.success(res, invoice, message || 'Invoice created successfully', 201, {
      invoiceId: invoice.id,
      transactionId: invoice.invoiceNumber,
      amount: parseFloat(invoice.amount.toString()),
      currency: invoice.currency,
      financialEvent: 'invoice_created'
    });
  }

  /**
   * Send payment processed response
   */
  static paymentProcessed(res: Response, payment: any, message?: string): void {
    this.success(res, payment, message || 'Payment processed successfully', 201, {
      paymentId: payment.id,
      transactionId: payment.paymentNumber,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency,
      financialEvent: 'payment_processed'
    });
  }

  /**
   * Send payment status updated response
   */
  static paymentStatusUpdated(res: Response, payment: any, message?: string): void {
    this.success(res, payment, message || 'Payment status updated successfully', 200, {
      paymentId: payment.id,
      transactionId: payment.paymentNumber,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency,
      financialEvent: 'payment_status_updated'
    });
  }

  /**
   * Send payment failed response
   */
  static paymentFailed(res: Response, paymentId: number, amount: number, paymentMethod: string, reason: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: 'Payment processing failed',
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        paymentId,
        amount,
        paymentMethod,
        financialEvent: 'payment_failed',
        requiresAudit: true,
        complianceLevel: 'error'
      }
    };
    res.status(400).json(response);

    // Log payment failure
    logger.logPaymentFailed(paymentId, amount, paymentMethod, reason, { correlationId });
  }

  /**
   * Send refund processed response
   */
  static refundProcessed(res: Response, refund: any, message?: string): void {
    this.success(res, refund, message || 'Refund processed successfully', 200, {
      paymentId: refund.paymentId,
      refundId: refund.id,
      amount: parseFloat(refund.amount.toString()),
      currency: refund.currency,
      financialEvent: 'refund_processed',
      requiresAudit: true
    });
  }

  /**
   * Send commission calculated response
   */
  static commissionCalculated(res: Response, commission: any, message?: string): void {
    this.success(res, commission, message || 'Commission calculated successfully', 201, {
      commissionId: commission.id,
      transactionId: commission.commissionNumber,
      amount: parseFloat(commission.amount.toString()),
      currency: commission.currency,
      agentId: commission.agentId,
      financialEvent: 'commission_calculated'
    });
  }

  /**
   * Send commission paid response
   */
  static commissionPaid(res: Response, commission: any, message?: string): void {
    this.success(res, commission, message || 'Commission paid successfully', 200, {
      commissionId: commission.id,
      transactionId: commission.commissionNumber,
      amount: parseFloat(commission.amount.toString()),
      currency: commission.currency,
      agentId: commission.agentId,
      financialEvent: 'commission_paid'
    });
  }

  /**
   * Send financial dashboard response
   */
  static financialDashboard(res: Response, metrics: any): void {
    this.success(res, metrics, 'Financial dashboard metrics retrieved successfully', 200, {
      financialEvent: 'dashboard_access',
      auditTrail: true
    });
  }

  /**
   * Send financial reports response
   */
  static financialReports(res: Response, reports: any, reportType: string): void {
    this.success(res, reports, `${reportType} reports retrieved successfully`, 200, {
      financialEvent: 'reports_accessed',
      reportType,
      auditTrail: true
    });
  }

  /**
   * Send data export response
   */
  static dataExportComplete(res: Response, exportResult: any, exportType: string): void {
    this.success(res, exportResult, `${exportType} export completed successfully`, 200, {
      financialEvent: 'data_exported',
      exportType,
      recordCount: exportResult.recordCount,
      requiresAudit: true
    });
  }

  /**
   * Send bulk operation response
   */
  static bulkOperation(res: Response, result: any, operationType: string, totalAmount?: number): void {
    this.success(res, result, `Bulk ${operationType} completed successfully`, 200, {
      financialEvent: `bulk_${operationType}`,
      operationType,
      recordCount: result.updatedCount || result.processedCount || 0,
      totalAmount,
      requiresAudit: true
    });
  }

  /**
   * Send reconciliation report response
   */
  static reconciliationReport(res: Response, report: any, period: string): void {
    this.success(res, report, `Reconciliation report for ${period}`, 200, {
      financialEvent: 'reconciliation_completed',
      period,
      auditTrail: true,
      complianceLevel: 'high'
    });
  }

  /**
   * Send audit trail response
   */
  static auditTrail(res: Response, trail: any, entityType: string): void {
    this.success(res, trail, `Audit trail for ${entityType} retrieved successfully`, 200, {
      financialEvent: 'audit_trail_accessed',
      entityType,
      auditTrail: true,
      complianceLevel: 'high'
    });
  }

  /**
   * Send compliance check response
   */
  static complianceCheck(res: Response, result: any, checkType: string): void {
    this.success(res, result, `Compliance check for ${checkType} completed`, 200, {
      financialEvent: 'compliance_check',
      checkType,
      auditTrail: true,
      complianceLevel: result.status === 'pass' ? 'compliant' : 'non_compliant'
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
      correlationId,
      metadata: { auditTrail: true, complianceLevel: 'error', requiresAudit: statusCode >= 400 }
    };

    res.status(statusCode).json(response);

    // Log error for debugging
    logger.error('Finance API Error Response', {
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
      correlationId,
      metadata: { auditTrail: true, complianceLevel: 'validation_error' }
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
      correlationId,
      metadata: { auditTrail: true, complianceLevel: 'not_found' }
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
      correlationId,
      metadata: { auditTrail: true, complianceLevel: 'conflict', requiresAudit: true }
    };
    res.status(409).json(response);
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
        auditTrail: true,
        complianceLevel: 'business_rule_violation',
        rule,
        requiresAudit: true
      }
    };
    res.status(422).json(response);
  }

  /**
   * Send compliance error response
   */
  static complianceError(res: Response, message: string, complianceType: string, severity: 'high' | 'critical' = 'high'): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: `Compliance violation (${complianceType}): ${message}`,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        auditTrail: true,
        complianceLevel: 'compliance_violation',
        complianceType,
        severity,
        requiresAudit: true
      }
    };
    res.status(400).json(response);

    // Log compliance error
    logger.logRegulatoryViolation(complianceType, message, severity, { correlationId });
  }

  /**
   * Send payment gateway error response
   */
  static paymentGatewayError(res: Response, gateway: string, message: string, transactionId?: string): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: `Payment gateway error: ${gateway} - ${message}`,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        auditTrail: true,
        complianceLevel: 'payment_gateway_error',
        gateway,
        transactionId,
        requiresAudit: true
      }
    };
    res.status(502).json(response);

    // Log payment gateway error
    logger.logPaymentGatewayError(gateway, message, transactionId, { correlationId });
  }

  /**
   * Send rate limit exceeded response
   */
  static rateLimitExceeded(res: Response, retryAfter?: number): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: 'Rate limit exceeded - Too many financial transactions',
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        auditTrail: true,
        complianceLevel: 'rate_limit_violation',
        requiresAudit: true
      }
    };

    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }

    res.status(429).json(response);
  }

  /**
   * Send data integrity error response
   */
  static dataIntegrityError(res: Response, message: string, entityType: string, entityId: number): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: false,
      error: `Data integrity error in ${entityType} ${entityId}: ${message}`,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        auditTrail: true,
        complianceLevel: 'data_integrity_violation',
        entityType,
        entityId,
        requiresAudit: true
      }
    };
    res.status(400).json(response);

    // Log data integrity error
    logger.logDataIntegrityCheck('integrity_check', 'fail', {
      entityType,
      entityId,
      error: message,
      correlationId
    });
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send accepted response (for async financial operations)
   */
  static accepted(res: Response, data?: any, message?: string, metadata?: any): void {
    const correlationId = (res.req as any)?.correlationId;
    const response: ApiResponse = {
      success: true,
      data,
      message: message || 'Financial request accepted for processing',
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        auditTrail: true,
        complianceLevel: 'financial_processing',
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
 * Global error handler middleware with financial compliance
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req as any).correlationId;

  // Log the error with financial context
  logger.error('Finance Unhandled error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    financialContext: {
      amount: req.body.amount,
      currency: req.body.currency,
      invoiceId: req.body.invoiceId,
      paymentId: req.body.paymentId
    }
  });

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return FinanceResponseHelper.validationError(res, [err.message]);
  }

  if (err.name === 'CastError') {
    return FinanceResponseHelper.error(res, 'Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return FinanceResponseHelper.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return FinanceResponseHelper.error(res, 'Token expired', 401);
  }

  if (err.name === 'MulterError') {
    if (err.message.includes('File too large')) {
      return FinanceResponseHelper.error(res, 'File too large', 413);
    }
    return FinanceResponseHelper.error(res, 'File upload error', 400);
  }

  // Default error
  FinanceResponseHelper.error(res,
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
    correlationId,
    metadata: { auditTrail: true, complianceLevel: 'not_found' }
  };
  res.status(404).json(response);
}

// Export ResponseHelper as default for convenience
export default FinanceResponseHelper;