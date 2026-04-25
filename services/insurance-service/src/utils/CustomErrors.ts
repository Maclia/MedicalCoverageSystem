/**
 * Custom error classes for Insurance Service
 * Provides domain-specific error handling with proper error codes and messages
 * Standard error implementation used across all modern services
 */

export class InsuranceServiceError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INSURANCE_ERROR') {
    super(message);
    this.name = 'InsuranceServiceError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends InsuranceServiceError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends InsuranceServiceError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DuplicateResourceError extends InsuranceServiceError {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`, 409, 'DUPLICATE_RESOURCE');
    this.name = 'DuplicateResourceError';
  }
}

export class BusinessRuleError extends InsuranceServiceError {
  constructor(message: string, rule?: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
    this.name = 'BusinessRuleError';
  }
}

export class AuthenticationError extends InsuranceServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends InsuranceServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends InsuranceServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends InsuranceServiceError {
  constructor(service: string, message: string) {
    super(`External service ${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends InsuranceServiceError {
  constructor(message: string, operation?: string) {
    super(`Database error${operation ? ` during ${operation}` : ''}: ${message}`, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends InsuranceServiceError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 500, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

// Insurance domain specific errors
export class SchemeNotFoundError extends NotFoundError {
  constructor(schemeId: number) {
    super(`Insurance Scheme with ID ${schemeId}`);
    this.name = 'SchemeNotFoundError';
  }
}

export class BenefitNotFoundError extends NotFoundError {
  constructor(benefitId: number) {
    super(`Benefit with ID ${benefitId}`);
    this.name = 'BenefitNotFoundError';
  }
}

export class CompanyNotFoundError extends NotFoundError {
  constructor(companyId: number) {
    super(`Company with ID ${companyId}`);
    this.name = 'CompanyNotFoundError';
  }
}

export class BenefitLimitExceededError extends BusinessRuleError {
  constructor(benefitName: string, limit: number, requested: number) {
    super(`Benefit limit exceeded for ${benefitName}: limit ${limit}, requested ${requested}`, 'BENEFIT_LIMIT_EXCEEDED');
    this.name = 'BenefitLimitExceededError';
  }
}

export class SchemeEligibilityError extends BusinessRuleError {
  constructor(message: string) {
    super(`Scheme eligibility check failed: ${message}`, 'SCHEME_ELIGIBILITY_ERROR');
    this.name = 'SchemeEligibilityError';
  }
}

// Utility function to determine if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof InsuranceServiceError) {
    return error.isOperational;
  }
  return false;
}

// Utility function to create appropriate error from error code
export function createErrorFromCode(errorCode: string, message?: string): InsuranceServiceError {
  const errorMap: Record<string, (message?: string) => InsuranceServiceError> = {
    VALIDATION_ERROR: (msg) => new ValidationError(msg || 'Validation error'),
    NOT_FOUND: (msg) => new NotFoundError(msg),
    DUPLICATE_RESOURCE: (msg) => new DuplicateResourceError(msg || 'Resource', 'field'),
    BUSINESS_RULE_VIOLATION: (msg) => new BusinessRuleError(msg || 'Business rule violation'),
    AUTHENTICATION_ERROR: (msg) => new AuthenticationError(msg),
    AUTHORIZATION_ERROR: (msg) => new AuthorizationError(msg),
    RATE_LIMIT_EXCEEDED: (msg) => new RateLimitError(msg),
    DATABASE_ERROR: (msg) => new DatabaseError(msg || 'Database operation failed'),
    CONFIGURATION_ERROR: (msg) => new ConfigurationError(msg || 'Configuration error'),
  };

  const createError = errorMap[errorCode] || ((msg) => new InsuranceServiceError(msg || `Error: ${errorCode}`));
  return createError(message);
}

export default {
  InsuranceServiceError,
  ValidationError,
  NotFoundError,
  DuplicateResourceError,
  BusinessRuleError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  
  // Insurance specific errors
  SchemeNotFoundError,
  BenefitNotFoundError,
  CompanyNotFoundError,
  BenefitLimitExceededError,
  SchemeEligibilityError,
  
  isOperationalError,
  createErrorFromCode
};