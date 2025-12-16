import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResponseHelper } from '../middleware/responseMiddleware';

/**
 * Validation middleware factory
 * Creates middleware to validate request body, query, or params against Zod schema
 */
export function validateRequest(
  schema: z.ZodSchema,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate;

      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
      }

      // Parse and validate the data
      const validatedData = schema.parse(dataToValidate);

      // Replace the original data with validated data
      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return ResponseHelper.validationError(res, errors);
      }
      return ResponseHelper.error(res, 'Validation failed', 400);
    }
  };
}

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export function sanitizeInput(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeInput(value);
  }

  return sanitized;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: any): any {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove JavaScript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, ''); // Remove data URLs
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate and sanitize phone number (Kenyan format)
 */
export function validateKenyanPhone(phone: string): boolean {
  const phoneRegex = /^254[7]\d{8}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate Kenyan national ID
 */
export function validateNationalId(nationalId: string): boolean {
  const nationalIdRegex = /^\d{8}$/;
  return nationalIdRegex.test(nationalId);
}

/**
 * Validate date of birth (must be at least 18 years old and not more than 120 years old)
 */
export function validateDateOfBirth(dateOfBirth: Date): boolean {
  const now = new Date();
  const ageInYears = (now.getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  return ageInYears >= 18 && ageInYears <= 120;
}

/**
 * Validate employee ID format
 */
export function validateEmployeeId(employeeId: string): boolean {
  // Employee ID should be at least 1 character and contain only alphanumeric characters, hyphens, and underscores
  const employeeIdRegex = /^[a-zA-Z0-9\-_]{1,50}$/;
  return employeeIdRegex.test(employeeId);
}

/**
 * Check if a member type is valid
 */
export function isValidMemberType(memberType: string): boolean {
  return ['principal', 'dependent'].includes(memberType);
}

/**
 * Check if a dependent type is valid
 */
export function isValidDependentType(dependentType: string): boolean {
  return ['spouse', 'child', 'parent'].includes(dependentType);
}

/**
 * Check if a membership status is valid
 */
export function isValidMembershipStatus(status: string): boolean {
  return ['pending', 'active', 'suspended', 'terminated', 'expired'].includes(status);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: any, limit?: any): { page: number; limit: number } {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return { page: validatedPage, limit: validatedLimit };
}

/**
 * Validate date range
 */
export function validateDateRange(dateFrom?: string, dateTo?: string): { dateFrom?: Date; dateTo?: Date } | null {
  const result: { dateFrom?: Date; dateTo?: Date } = {};

  try {
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (isNaN(fromDate.getTime())) return null;
      result.dateFrom = fromDate;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (isNaN(toDate.getTime())) return null;
      result.dateTo = toDate;
    }

    // Validate that dateFrom is before dateTo
    if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) {
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Validate document type
 */
export function isValidDocumentType(documentType: string): boolean {
  const validTypes = [
    'national_id',
    'passport',
    'birth_certificate',
    'marriage_certificate',
    'employment_letter',
    'medical_report',
    'student_letter',
    'disability_certificate',
    'income_proof',
    'address_proof',
    'other'
  ];

  return validTypes.includes(documentType);
}

/**
 * Validate communication type
 */
export function isValidCommunicationType(communicationType: string): boolean {
  const validTypes = [
    'enrollment_confirmation',
    'suspension_notice',
    'termination_notice',
    'renewal_notification',
    'benefit_update',
    'policy_update'
  ];

  return validTypes.includes(communicationType);
}

/**
 * Validate communication channel
 */
export function isValidCommunicationChannel(channel: string): boolean {
  return ['email', 'sms', 'push', 'whatsapp'].includes(channel);
}

/**
 * Validate lifecycle event type
 */
export function isValidLifecycleEventType(eventType: string): boolean {
  const validTypes = [
    'enrollment',
    'activation',
    'suspension',
    'reinstatement',
    'termination',
    'renewal',
    'benefit_change',
    'coverage_update'
  ];

  return validTypes.includes(eventType);
}

/**
 * Validate bulk update type
 */
export function isValidBulkUpdateType(updateType: string): boolean {
  return ['suspend', 'activate', 'terminate', 'renew'].includes(updateType);
}

/**
 * Middleware to validate member ID parameter
 */
export function validateMemberId(req: Request, res: Response, next: NextFunction): void {
  const memberId = parseInt(req.params.id || req.params.memberId);

  if (isNaN(memberId) || memberId <= 0) {
    return ResponseHelper.error(res, 'Invalid member ID', 400);
  }

  // Add validated ID to request for use in route handlers
  (req as any).validatedMemberId = memberId;
  next();
}

/**
 * Middleware to validate company ID parameter
 */
export function validateCompanyId(req: Request, res: Response, next: NextFunction): void {
  const companyId = parseInt(req.params.companyId || req.body.companyId || req.query.companyId as string);

  if (isNaN(companyId) || companyId <= 0) {
    return ResponseHelper.error(res, 'Invalid company ID', 400);
  }

  // Add validated ID to request for use in route handlers
  (req as any).validatedCompanyId = companyId;
  next();
}

/**
 * Middleware to validate document ID parameter
 */
export function validateDocumentId(req: Request, res: Response, next: NextFunction): void {
  const documentId = parseInt(req.params.documentId);

  if (isNaN(documentId) || documentId <= 0) {
    return ResponseHelper.error(res, 'Invalid document ID', 400);
  }

  // Add validated ID to request for use in route handlers
  (req as any).validatedDocumentId = documentId;
  next();
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds maximum allowed size of 10MB' };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'File type not allowed. Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX' };
  }

  return { valid: true };
}

/**
 * Sanitize and validate search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  return sanitizeInput(query.trim()).substring(0, 500); // Limit to 500 characters
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}