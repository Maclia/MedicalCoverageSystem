/**
 * Custom error classes for Finance Service
 * Provides domain-specific error handling with proper error codes and compliance features
 */

export class FinanceError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly requiresAudit: boolean;
  public readonly financialImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'FINANCE_ERROR',
    financialImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none',
    requiresAudit: boolean = false
  ) {
    super(message);
    this.name = 'FinanceError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.requiresAudit = requiresAudit;
    this.financialImpact = financialImpact;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends FinanceError {
  constructor(message: string, field?: string, requiresAudit: boolean = false) {
    super(message, 400, 'VALIDATION_ERROR', 'low', requiresAudit);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends FinanceError {
  constructor(resource: string = 'Resource', requiresAudit: boolean = false) {
    super(`${resource} not found`, 404, 'NOT_FOUND', 'low', requiresAudit);
    this.name = 'NotFoundError';
  }
}

export class DuplicateResourceError extends FinanceError {
  constructor(resource: string, field: string, requiresAudit: boolean = false) {
    super(`${resource} with this ${field} already exists`, 409, 'DUPLICATE_RESOURCE', 'medium', requiresAudit);
    this.name = 'DuplicateResourceError';
  }
}

export class BusinessRuleError extends FinanceError {
  constructor(message: string, rule?: string, requiresAudit: boolean = true) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', 'medium', requiresAudit);
    this.name = 'BusinessRuleError';
  }
}

export class AuthenticationError extends FinanceError {
  constructor(message: string = 'Authentication required', requiresAudit: boolean = true) {
    super(message, 401, 'AUTHENTICATION_ERROR', 'high', requiresAudit);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends FinanceError {
  constructor(message: string = 'Access denied', requiresAudit: boolean = true) {
    super(message, 403, 'AUTHORIZATION_ERROR', 'high', requiresAudit);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends FinanceError {
  constructor(message: string = 'Rate limit exceeded', requiresAudit: boolean = false) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', 'medium', requiresAudit);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends FinanceError {
  constructor(service: string, message: string, financialImpact: 'low' | 'medium' | 'high' = 'medium') {
    super(`External service ${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', financialImpact, true);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends FinanceError {
  constructor(message: string, operation?: string, requiresAudit: boolean = true) {
    super(`Database error${operation ? ` during ${operation}` : ''}: ${message}`, 500, 'DATABASE_ERROR', 'high', requiresAudit);
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends FinanceError {
  constructor(message: string, requiresAudit: boolean = true) {
    super(`Configuration error: ${message}`, 500, 'CONFIGURATION_ERROR', 'high', requiresAudit);
    this.name = 'ConfigurationError';
  }
}

// Invoice-specific errors
export class InvoiceNotFoundError extends NotFoundError {
  constructor(invoiceId: number, requiresAudit: boolean = false) {
    super(`Invoice with ID ${invoiceId}`, requiresAudit);
    this.name = 'InvoiceNotFoundError';
  }
}

export class InvoiceStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} invoice with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'INVOICE_STATUS_ERROR', true);
    this.name = 'InvoiceStatusError';
  }
}

export class InvoiceDuplicateError extends DuplicateResourceError {
  constructor(field: string, requiresAudit: boolean = true) {
    super('Invoice', field, requiresAudit);
    this.name = 'InvoiceDuplicateError';
  }
}

export class InvoiceCalculationError extends FinanceError {
  constructor(message: string, invoiceId?: number) {
    const context = invoiceId ? ` (Invoice ID: ${invoiceId})` : '';
    super(`Invoice calculation error${context}: ${message}`, 400, 'INVOICE_CALCULATION_ERROR', 'high', true);
    this.name = 'InvoiceCalculationError';
  }
}

// Payment-specific errors
export class PaymentNotFoundError extends NotFoundError {
  constructor(paymentId: number, requiresAudit: boolean = false) {
    super(`Payment with ID ${paymentId}`, requiresAudit);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} payment with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'PAYMENT_STATUS_ERROR', true);
    this.name = 'PaymentStatusError';
  }
}

export class PaymentGatewayError extends ExternalServiceError {
  constructor(gateway: string, message: string, transactionId?: string) {
    const context = transactionId ? ` (Transaction: ${transactionId})` : '';
    super(`${gateway}${context}`, message, 'high');
    this.name = 'PaymentGatewayError';
  }
}

export class PaymentProcessingError extends FinanceError {
  constructor(message: string, paymentId: number, amount: number) {
    super(`Payment processing error for payment ${paymentId}: ${message}`, 400, 'PAYMENT_PROCESSING_ERROR', 'high', true);
    this.name = 'PaymentProcessingError';
    this.message = `${message} (Amount: ${amount})`;
  }
}

export class PaymentRefundError extends BusinessRuleError {
  constructor(message: string, paymentId: number, refundAmount: number) {
    super(`Refund error for payment ${paymentId}: ${message}`, 'PAYMENT_REFUND_ERROR', true);
    this.name = 'PaymentRefundError';
  }
}

export class PaymentAmountError extends ValidationError {
  constructor(message: string, requiresAudit: boolean = true) {
    super(`Payment amount error: ${message}`, 'amount', requiresAudit);
    this.name = 'PaymentAmountError';
  }
}

// Commission-specific errors
export class CommissionNotFoundError extends NotFoundError {
  constructor(commissionId: number, requiresAudit: boolean = false) {
    super(`Commission with ID ${commissionId}`, requiresAudit);
    this.name = 'CommissionNotFoundError';
  }
}

export class CommissionCalculationError extends FinanceError {
  constructor(message: string, agentId: number, transactionId?: number) {
    const context = transactionId ? ` (Transaction: ${transactionId})` : '';
    super(`Commission calculation error for agent ${agentId}${context}: ${message}`, 400, 'COMMISSION_CALCULATION_ERROR', 'high', true);
    this.name = 'CommissionCalculationError';
  }
}

export class CommissionStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} commission with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'COMMISSION_STATUS_ERROR', true);
    this.name = 'CommissionStatusError';
  }
}

export class CommissionTierError extends BusinessRuleError {
  constructor(message: string, tierLevel?: number) {
    const context = tierLevel ? ` (Tier: ${tierLevel})` : '';
    super(`Commission tier error${context}: ${message}`, 'COMMISSION_TIER_ERROR', true);
    this.name = 'CommissionTierError';
  }
}

// Expense-specific errors
export class ExpenseNotFoundError extends NotFoundError {
  constructor(expenseId: number, requiresAudit: boolean = false) {
    super(`Expense with ID ${expenseId}`, requiresAudit);
    this.name = 'ExpenseNotFoundError';
  }
}

export class ExpenseStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} expense with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'EXPENSE_STATUS_ERROR', true);
    this.name = 'ExpenseStatusError';
  }
}

export class ExpenseApprovalError extends AuthorizationError {
  constructor(message: string, expenseId: number, userId: number) {
    super(`Expense approval error for expense ${expenseId} by user ${userId}: ${message}`);
    this.name = 'ExpenseApprovalError';
  }
}

export class BudgetExceededError extends BusinessRuleError {
  constructor(budgetId: number, budgetAmount: number, requestedAmount: number, category?: string) {
    const context = category ? ` (Category: ${category})` : '';
    super(`Budget exceeded${context}. Available: ${budgetAmount}, Requested: ${requestedAmount}`, 'BUDGET_EXCEEDED', true);
    this.name = 'BudgetExceededError';
  }
}

// Financial Report-specific errors
export class ReportGenerationError extends FinanceError {
  constructor(message: string, reportType: string, period?: string) {
    const context = period ? ` (${period})` : '';
    super(`Report generation error for ${reportType}${context}: ${message}`, 500, 'REPORT_GENERATION_ERROR', 'medium', true);
    this.name = 'ReportGenerationError';
  }
}

export class ReportNotFoundError extends NotFoundError {
  constructor(reportId: number, requiresAudit: boolean = false) {
    super(`Financial report with ID ${reportId}`, requiresAudit);
    this.name = 'ReportNotFoundError';
  }
}

export class ReportValidationError extends ValidationError {
  constructor(message: string, requiresAudit: boolean = true) {
    super(`Report validation error: ${message}`, 'report', requiresAudit);
    this.name = 'ReportValidationError';
  }
}

// Data Integrity and Compliance errors
export class DataIntegrityError extends FinanceError {
  constructor(message: string, entityType: string, entityId: number) {
    super(`Data integrity error for ${entityType} ${entityId}: ${message}`, 400, 'DATA_INTEGRITY_ERROR', 'high', true);
    this.name = 'DataIntegrityError';
  }
}

export class ComplianceError extends FinanceError {
  constructor(message: string, complianceType: string, requiresAudit: boolean = true) {
    super(`Compliance violation (${complianceType}): ${message}`, 400, 'COMPLIANCE_ERROR', 'critical', requiresAudit);
    this.name = 'ComplianceError';
  }
}

export class AuditTrailError extends FinanceError {
  constructor(message: string, requiresAudit: boolean = true) {
    super(`Audit trail error: ${message}`, 500, 'AUDIT_TRAIL_ERROR', 'critical', requiresAudit);
    this.name = 'AuditTrailError';
  }
}

export class RegulatoryViolationError extends ComplianceError {
  constructor(regulation: string, message: string, severity: 'high' | 'critical' = 'high') {
    super(`Regulatory violation (${regulation}): ${message}`, regulation);
    this.name = 'RegulatoryViolationError';
    this.financialImpact = severity === 'critical' ? 'critical' : 'high';
  }
}

// Currency and Exchange Rate errors
export class CurrencyError extends ValidationError {
  constructor(message: string, currency?: string) {
    const context = currency ? ` (Currency: ${currency})` : '';
    super(`Currency error${context}: ${message}`, 'currency');
    this.name = 'CurrencyError';
  }
}

export class ExchangeRateError extends ExternalServiceError {
  constructor(message: string, fromCurrency: string, toCurrency: string) {
    super('Exchange Rate Service', `${message} (${fromCurrency} to ${toCurrency})`, 'medium');
    this.name = 'ExchangeRateError';
  }
}

// Tax and Regulatory errors
export class TaxCalculationError extends FinanceError {
  constructor(message: string, taxType?: string, amount?: number) {
    const context = taxType ? ` (Tax Type: ${taxType})` : '';
    const amountContext = amount ? ` (Amount: ${amount})` : '';
    super(`Tax calculation error${context}${amountContext}: ${message}`, 400, 'TAX_CALCULATION_ERROR', 'high', true);
    this.name = 'TaxCalculationError';
  }
}

export class TaxComplianceError extends ComplianceError {
  constructor(message: string, jurisdiction: string) {
    super(`Tax compliance error (${jurisdiction}): ${message}`, 'TAX_COMPLIANCE');
    this.name = 'TaxComplianceError';
  }
}

// Reconciliation errors
export class ReconciliationError extends FinanceError {
  constructor(message: string, period: string, entityType?: string) {
    const context = entityType ? ` for ${entityType}` : '';
    super(`Reconciliation error for period ${period}${context}: ${message}`, 400, 'RECONCILIATION_ERROR', 'high', true);
    this.name = 'ReconciliationError';
  }
}

export class ReconciliationMismatchError extends ReconciliationError {
  constructor(expectedAmount: number, actualAmount: number, entityType: string, period: string) {
    super(`Amount mismatch in ${entityType}. Expected: ${expectedAmount}, Actual: ${actualAmount}`, period, entityType);
    this.name = 'ReconciliationMismatchError';
  }
}

// Export and Import errors
export class DataExportError extends FinanceError {
  constructor(message: string, exportType: string, recordCount?: number) {
    const context = recordCount ? ` (${recordCount} records)` : '';
    super(`Data export error for ${exportType}${context}: ${message}`, 400, 'DATA_EXPORT_ERROR', 'medium', true);
    this.name = 'DataExportError';
  }
}

export class DataImportError extends FinanceError {
  constructor(message: string, importType: string, row?: number) {
    const context = row ? ` (Row: ${row})` : '';
    super(`Data import error for ${importType}${context}: ${message}`, 400, 'DATA_IMPORT_ERROR', 'medium', true);
    this.name = 'DataImportError';
  }
}

// Utility functions
export function isOperationalError(error: Error): boolean {
  if (error instanceof FinanceError) {
    return error.isOperational;
  }
  return false;
}

export function requiresAudit(error: Error): boolean {
  if (error instanceof FinanceError) {
    return error.requiresAudit;
  }
  return false;
}

export function getFinancialImpact(error: Error): string {
  if (error instanceof FinanceError) {
    return error.financialImpact;
  }
  return 'none';
}

export function createErrorFromCode(errorCode: string, message?: string, requiresAudit?: boolean): FinanceError {
  const errorMap: Record<string, typeof FinanceError> = {
    VALIDATION_ERROR: ValidationError,
    NOT_FOUND: NotFoundError,
    DUPLICATE_RESOURCE: DuplicateResourceError,
    BUSINESS_RULE_VIOLATION: BusinessRuleError,
    AUTHENTICATION_ERROR: AuthenticationError,
    AUTHORIZATION_ERROR: AuthorizationError,
    RATE_LIMIT_EXCEEDED: RateLimitError,
    DATABASE_ERROR: DatabaseError,
    CONFIGURATION_ERROR: ConfigurationError,
    INVOICE_CALCULATION_ERROR: InvoiceCalculationError,
    PAYMENT_PROCESSING_ERROR: PaymentProcessingError,
    COMMISSION_CALCULATION_ERROR: CommissionCalculationError,
    REPORT_GENERATION_ERROR: ReportGenerationError,
    DATA_INTEGRITY_ERROR: DataIntegrityError,
    COMPLIANCE_ERROR: ComplianceError,
    AUDIT_TRAIL_ERROR: AuditTrailError,
    RECONCILIATION_ERROR: ReconciliationError,
    DATA_EXPORT_ERROR: DataExportError,
    DATA_IMPORT_ERROR: DataImportError,
  };

  const ErrorClass = errorMap[errorCode] || FinanceError;
  return new ErrorClass(message || `Error: ${errorCode}`);
}

export default {
  FinanceError,
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
  // Invoice errors
  InvoiceNotFoundError,
  InvoiceStatusError,
  InvoiceDuplicateError,
  InvoiceCalculationError,
  // Payment errors
  PaymentNotFoundError,
  PaymentStatusError,
  PaymentGatewayError,
  PaymentProcessingError,
  PaymentRefundError,
  PaymentAmountError,
  // Commission errors
  CommissionNotFoundError,
  CommissionCalculationError,
  CommissionStatusError,
  CommissionTierError,
  // Expense errors
  ExpenseNotFoundError,
  ExpenseStatusError,
  ExpenseApprovalError,
  BudgetExceededError,
  // Report errors
  ReportGenerationError,
  ReportNotFoundError,
  ReportValidationError,
  // Compliance errors
  DataIntegrityError,
  ComplianceError,
  AuditTrailError,
  RegulatoryViolationError,
  // Currency errors
  CurrencyError,
  ExchangeRateError,
  // Tax errors
  TaxCalculationError,
  TaxComplianceError,
  // Reconciliation errors
  ReconciliationError,
  ReconciliationMismatchError,
  // Export/Import errors
  DataExportError,
  DataImportError,
  isOperationalError,
  requiresAudit,
  getFinancialImpact,
  createErrorFromCode
};