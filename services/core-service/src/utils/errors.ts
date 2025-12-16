import { createLogger } from './logger';

const logger = createLogger();

// Base error class
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details })
      }
    };
  }
}

// Validation errors (400)
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

// Authentication errors (401)
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization errors (403)
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Not found errors (404)
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Conflict errors (409)
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

// Rate limit errors (429)
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests',
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      { retryAfter }
    );
  }
}

// Business logic errors (422)
export class BusinessRuleError extends AppError {
  constructor(message: string, rule?: string, details?: any) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', true, {
      rule,
      ...details
    });
  }
}

// Integration errors (502, 503, 504)
export class IntegrationError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error,
    statusCode: number = 502
  ) {
    super(message, statusCode, 'INTEGRATION_ERROR', true, {
      provider,
      originalError: originalError?.message
    });
  }
}

// Database errors (500)
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      'Database operation failed',
      500,
      'DATABASE_ERROR',
      true,
      {
        originalError: originalError?.message,
        userMessage: message
      }
    );
  }
}

// Security errors (various statuses)
export class SecurityError extends AppError {
  constructor(
    message: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    statusCode: number = 403
  ) {
    super(message, statusCode, 'SECURITY_VIOLATION', true, { severity });
  }
}

// Critical system errors (500)
export class SystemError extends AppError {
  constructor(message: string, details?: any) {
    super(
      'Internal system error',
      500,
      'SYSTEM_ERROR',
      false, // Not operational - requires admin attention
      details
    );
  }
}

// Error factory for common cases
export class ErrorFactory {
  static userNotFound(email?: string): NotFoundError {
    return new NotFoundError('User' + (email ? ` with email ${email.substring(0, 3)}***` : ''));
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid email or password');
  }

  static accountInactive(): AuthenticationError {
    return new AuthenticationError('Account is deactivated');
  }

  static insufficientPermission(action: string, resource: string): AuthorizationError {
    return new AuthorizationError(`Insufficient permission to ${action} ${resource}`);
  }

  static resourceNotFound(resource: string, identifier?: string): NotFoundError {
    const message = identifier ? `${resource} with identifier ${identifier} not found` : `${resource} not found`;
    return new NotFoundError(message);
  }

  static validationFailed(details: any): ValidationError {
    return new ValidationError('Validation failed', details);
  }

  static businessRuleViolation(rule: string, message: string, details?: any): BusinessRuleError {
    return new BusinessRuleError(message, rule, details);
  }

  static integrationFailed(provider: string, operation: string, originalError?: Error): IntegrationError {
    return new IntegrationError(
      `Failed to ${operation} with ${provider}`,
      provider,
      originalError
    );
  }

  static rateLimitExceeded(retryAfter?: number): RateLimitError {
    return new RateLimitError(retryAfter);
  }

  static securityViolation(message: string, severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): SecurityError {
    return new SecurityError(message, severity);
  }

  static databaseError(operation: string, originalError?: Error): DatabaseError {
    return new DatabaseError(`Failed to ${operation}`, originalError);
  }

  static systemError(message: string, details?: any): SystemError {
    return new SystemError(message, details);
  }
}

// Error handler utility
export class ErrorHandler {
  /**
   * Convert any error to AppError instance
   */
  static normalizeError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle common Node.js errors
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, error.details);
    }

    if (error.name === 'CastError') {
      return new ValidationError('Invalid data format');
    }

    if (error.code === 'ENOENT') {
      return new NotFoundError('File or resource');
    }

    if (error.code === 'EACCES') {
      return new AuthorizationError('Permission denied');
    }

    if (error.code === 'ETIMEDOUT') {
      return new IntegrationError('Service timeout', 'Unknown Service', error);
    }

    if (error.code === 'ECONNREFUSED') {
      return new IntegrationError('Service unavailable', 'Unknown Service', error);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Invalid authentication token');
    }

    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Authentication token expired');
    }

    // Handle database errors
    if (error.code?.startsWith('23')) { // PostgreSQL constraint violations
      return new ConflictError('Data constraint violation', {
        constraint: error.constraint,
        detail: error.detail
      });
    }

    if (error.code?.startsWith('28')) { // PostgreSQL authentication errors
      return new DatabaseError('Database authentication failed', error);
    }

    // Default case
    const appError = new SystemError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      {
        name: error.name,
        code: error.code,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      }
    );

    return appError;
  }

  /**
   * Log error and return normalized error
   */
  static handleError(error: any, context?: any): AppError {
    const appError = this.normalizeError(error);

    logger.error('Application error', error, {
      normalizedError: {
        code: appError.code,
        statusCode: appError.statusCode,
        message: appError.message,
        isOperational: appError.isOperational
      },
      context
    });

    return appError;
  }

  /**
   * Check if error is operational (should not crash the app)
   */
  static isOperationalError(error: any): boolean {
    const appError = this.normalizeError(error);
    return appError.isOperational;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: AppError, correlationId?: string): any {
    const response = error.toJSON();

    if (correlationId) {
      response.correlationId = correlationId;
    }

    // Add additional context for development
    if (process.env.NODE_ENV !== 'production') {
      response.debug = {
        stack: error.stack,
        statusCode: error.statusCode,
        isOperational: error.isOperational
      };
    }

    return response;
  }
}

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
export const createValidationError = (errors: any[]): ValidationError => {
  const details = errors.map(err => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
    value: err.value
  }));

  return new ValidationError('Request validation failed', { errors: details });
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BusinessRuleError,
  IntegrationError,
  DatabaseError,
  SecurityError,
  SystemError,
  ErrorFactory,
  ErrorHandler,
  asyncHandler,
  createValidationError
};