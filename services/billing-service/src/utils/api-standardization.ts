import crypto from 'crypto';

// Error codes enumeration
export const ErrorCodes = {
  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Business logic errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INVOICE_FINALIZED: 'INVOICE_FINALIZED',
  INVALID_INVOICE_STATUS: 'INVALID_INVOICE_STATUS',
  PAYMENT_EXCEEDS_BALANCE: 'PAYMENT_EXCEEDS_BALANCE',
  PAYMENT_NOT_REFUNDABLE: 'PAYMENT_NOT_REFUNDABLE',
  REFUND_EXCEEDS_PAYMENT: 'REFUND_EXCEEDS_PAYMENT',
  INVALID_COMMISSION_STATUS: 'INVALID_COMMISSION_STATUS',

  // Integration errors
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Standard API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  correlationId?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Response factory class
export class ResponseFactory {
  private static createBaseResponse(success: boolean, correlationId?: string): Omit<ApiResponse, 'success'> {
    return {
      correlationId,
      timestamp: new Date().toISOString()
    };
  }

  static createSuccessResponse<T>(
    data?: T,
    message?: string,
    correlationId?: string
  ): ApiResponse<T> {
    return {
      ...this.createBaseResponse(true, correlationId),
      success: true,
      data,
      message
    };
  }

  static createErrorResponse(
    code: string,
    message: string,
    details?: any,
    correlationId?: string
  ): ApiResponse {
    return {
      ...this.createBaseResponse(false, correlationId),
      success: false,
      error: {
        code,
        message,
        details
      }
    };
  }

  static createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    correlationId?: string,
    message?: string
  ): ApiResponse<T[]> {
    return {
      ...this.createBaseResponse(true, correlationId),
      success: true,
      data,
      message,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

// Validation error helper
export const createValidationErrorResponse = (
  errors: ValidationError[],
  correlationId?: string
): ApiResponse => {
  return ResponseFactory.createErrorResponse(
    ErrorCodes.VALIDATION_ERROR,
    'Validation failed',
    errors,
    correlationId
  );
};

// Business rule error helper
export const createBusinessRuleErrorResponse = (
  code: string,
  message: string,
  details?: any,
  correlationId?: string
): ApiResponse => {
  return ResponseFactory.createErrorResponse(
    code,
    message,
    details,
    correlationId
  );
};

// Utility functions
export const generateId = (): string => {
  return crypto.randomUUID();
};

export const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'creditCard',
    'cardNumber',
    'cvv',
    'expiry',
    'mpesaPassKey',
    'consumerSecret',
    'webhookSecret'
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    for (const key in obj) {
      if (sensitiveFields.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }

    return obj;
  };

  return sanitizeObject(sanitized);
};

export const formatCurrency = (amount: number | string, currency: string = 'KES'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency
  }).format(numAmount);
};

export const calculateTax = (amount: number, rate: number): number => {
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
};

export const calculateCommission = (
  baseAmount: number,
  rate: number,
  minAmount: number = 0
): number => {
  const commission = Math.round(baseAmount * rate * 100) / 100;
  return Math.max(commission, minAmount);
};

// Date helpers
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isOverdue = (dueDate: Date | string): boolean => {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return new Date() > due;
};

// Payment helpers
export const validatePaymentReference = (reference: string): boolean => {
  // Payment references should follow the format: PAY-YYYYMMDD-XXXX
  const pattern = /^PAY-\d{8}-\d{4}$/;
  return pattern.test(reference);
};

export const validateInvoiceNumber = (invoiceNumber: string): boolean => {
  // Invoice numbers should follow the format: INV-YYYYMMDD-XXXX
  const pattern = /^INV-\d{8}-\d{4}$/;
  return pattern.test(invoiceNumber);
};

export const generatePaymentReference = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY-${date}-${random}`;
};

export const generateInvoiceNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${date}-${random}`;
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Basic phone validation - can be extended based on requirements
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isValidAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 999999999.99; // Reasonable limits
};

export const validateMpesaPhoneNumber = (phone: string): boolean => {
  // Kenya phone numbers for M-Pesa (starts with 07, 01, or +254)
  const kenyaPhoneRegex = /^(\+254|0)?[17]\d{8}$/;
  return kenyaPhoneRegex.test(phone.replace(/\s/g, ''));
};

// Status helpers
export const getNextStatus = (currentStatus: string, action: string): string | null => {
  const statusTransitions: Record<string, Record<string, string>> = {
    draft: {
      send: 'sent',
      cancel: 'cancelled'
    },
    sent: {
      pay: 'partially_paid',
      'pay-full': 'paid',
      cancel: 'cancelled'
    },
    partially_paid: {
      'pay-full': 'paid',
      cancel: 'cancelled'
    }
  };

  return statusTransitions[currentStatus]?.[action] || null;
};

export const canTransitionStatus = (from: string, to: string): boolean => {
  const allowedTransitions: Record<string, string[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['partially_paid', 'paid', 'cancelled', 'overdue'],
    partially_paid: ['paid', 'cancelled'],
    paid: ['refunded'],
    cancelled: [],
    refunded: [],
    overdue: ['partially_paid', 'paid', 'cancelled']
  };

  return allowedTransitions[from]?.includes(to) || false;
};

// Error classification for better handling
export const categorizeError = (error: Error | any): {
  category: 'validation' | 'business' | 'integration' | 'infrastructure';
  userFriendly: boolean;
  recoverable: boolean;
} => {
  const message = error.message?.toLowerCase() || '';

  if (error.name === 'ValidationError' || message.includes('validation')) {
    return {
      category: 'validation',
      userFriendly: true,
      recoverable: true
    };
  }

  if (message.includes('permission') || message.includes('unauthorized')) {
    return {
      category: 'business',
      userFriendly: true,
      recoverable: false
    };
  }

  if (message.includes('database') || message.includes('connection')) {
    return {
      category: 'infrastructure',
      userFriendly: false,
      recoverable: true
    };
  }

  if (message.includes('external') || message.includes('api') || message.includes('gateway')) {
    return {
      category: 'integration',
      userFriendly: true,
      recoverable: true
    };
  }

  // Default
  return {
    category: 'business',
    userFriendly: false,
    recoverable: true
  };
};