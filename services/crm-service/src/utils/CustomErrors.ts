/**
 * Custom error classes for CRM Service
 * Provides domain-specific error handling with proper error codes and messages
 */

export class CrmError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'CRM_ERROR') {
    super(message);
    this.name = 'CrmError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CrmError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CrmError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DuplicateResourceError extends CrmError {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`, 409, 'DUPLICATE_RESOURCE');
    this.name = 'DuplicateResourceError';
  }
}

export class BusinessRuleError extends CrmError {
  constructor(message: string, rule?: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
    this.name = 'BusinessRuleError';
  }
}

export class AuthenticationError extends CrmError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CrmError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends CrmError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends CrmError {
  constructor(service: string, message: string) {
    super(`External service ${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends CrmError {
  constructor(message: string, operation?: string) {
    super(`Database error${operation ? ` during ${operation}` : ''}: ${message}`, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends CrmError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 500, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

// Lead-specific errors
export class LeadNotFoundError extends NotFoundError {
  constructor(leadId: number) {
    super(`Lead with ID ${leadId}`);
    this.name = 'LeadNotFoundError';
  }
}

export class LeadConversionError extends BusinessRuleError {
  constructor(message: string) {
    super(`Lead conversion failed: ${message}`, 'LEAD_CONVERSION_ERROR');
    this.name = 'LeadConversionError';
  }
}

export class DuplicateLeadError extends DuplicateResourceError {
  constructor(field: string) {
    super('Lead', field);
    this.name = 'DuplicateLeadError';
  }
}

// Contact-specific errors
export class ContactNotFoundError extends NotFoundError {
  constructor(contactId: number) {
    super(`Contact with ID ${contactId}`);
    this.name = 'ContactNotFoundError';
  }
}

export class DuplicateContactError extends DuplicateResourceError {
  constructor(field: string) {
    super('Contact', field);
    this.name = 'DuplicateContactError';
  }
}

// Company-specific errors
export class CompanyNotFoundError extends NotFoundError {
  constructor(companyId: number) {
    super(`Company with ID ${companyId}`);
    this.name = 'CompanyNotFoundError';
  }
}

export class DuplicateCompanyError extends DuplicateResourceError {
  constructor(field: string) {
    super('Company', field);
    this.name = 'DuplicateCompanyError';
  }
}

// Opportunity-specific errors
export class OpportunityNotFoundError extends NotFoundError {
  constructor(opportunityId: number) {
    super(`Opportunity with ID ${opportunityId}`);
    this.name = 'OpportunityNotFoundError';
  }
}

export class OpportunityStageError extends BusinessRuleError {
  constructor(message: string) {
    super(`Opportunity stage error: ${message}`, 'OPPORTUNITY_STAGE_ERROR');
    this.name = 'OpportunityStageError';
  }
}

// Activity-specific errors
export class ActivityNotFoundError extends NotFoundError {
  constructor(activityId: number) {
    super(`Activity with ID ${activityId}`);
    this.name = 'ActivityNotFoundError';
  }
}

export class ActivityCompletionError extends BusinessRuleError {
  constructor(message: string) {
    super(`Activity completion failed: ${message}`, 'ACTIVITY_COMPLETION_ERROR');
    this.name = 'ActivityCompletionError';
  }
}

// Email campaign-specific errors
export class EmailCampaignNotFoundError extends NotFoundError {
  constructor(campaignId: number) {
    super(`Email campaign with ID ${campaignId}`);
    this.name = 'EmailCampaignNotFoundError';
  }
}

export class EmailCampaignError extends CrmError {
  constructor(message: string, campaignId?: number) {
    const campaignInfo = campaignId ? ` (Campaign ID: ${campaignId})` : '';
    super(`Email campaign error${campaignInfo}: ${message}`, 400, 'EMAIL_CAMPAIGN_ERROR');
    this.name = 'EmailCampaignError';
  }
}

export class EmailDeliveryError extends ExternalServiceError {
  constructor(message: string, recipient?: string) {
    const recipientInfo = recipient ? ` (Recipient: ${recipient})` : '';
    super(`Email delivery${recipientInfo}: ${message}`, `EMAIL_DELIVERY_ERROR`);
    this.name = 'EmailDeliveryError';
  }
}

// Permission and access errors
export class ContactAccessDeniedError extends AuthorizationError {
  constructor(contactId: number, action: string) {
    super(`Access denied for contact ${contactId}: ${action}`);
    this.name = 'ContactAccessDeniedError';
  }
}

export class CompanyAccessDeniedError extends AuthorizationError {
  constructor(companyId: number, action: string) {
    super(`Access denied for company ${companyId}: ${action}`);
    this.name = 'CompanyAccessDeniedError';
  }
}

export class LeadAccessDeniedError extends AuthorizationError {
  constructor(leadId: number, action: string) {
    super(`Access denied for lead ${leadId}: ${action}`);
    this.name = 'LeadAccessDeniedError';
  }
}

// Data export/import errors
export class DataExportError extends CrmError {
  constructor(message: string) {
    super(`Data export failed: ${message}`, 400, 'DATA_EXPORT_ERROR');
    this.name = 'DataExportError';
  }
}

export class DataImportError extends CrmError {
  constructor(message: string, row?: number) {
    const rowInfo = row ? ` (Row: ${row})` : '';
    super(`Data import failed${rowInfo}: ${message}`, 400, 'DATA_IMPORT_ERROR');
    this.name = 'DataImportError';
  }
}

export class FileProcessingError extends CrmError {
  constructor(message: string) {
    super(`File processing error: ${message}`, 400, 'FILE_PROCESSING_ERROR');
    this.name = 'FileProcessingError';
  }
}

// Analytics and reporting errors
export class AnalyticsError extends CrmError {
  constructor(message: string) {
    super(`Analytics error: ${message}`, 400, 'ANALYTICS_ERROR');
    this.name = 'AnalyticsError';
  }
}

export class ReportGenerationError extends CrmError {
  constructor(message: string) {
    super(`Report generation failed: ${message}`, 500, 'REPORT_GENERATION_ERROR');
    this.name = 'ReportGenerationError';
  }
}

// Search and filtering errors
export class SearchError extends CrmError {
  constructor(message: string) {
    super(`Search error: ${message}`, 400, 'SEARCH_ERROR');
    this.name = 'SearchError';
  }
}

export class FilterError extends ValidationError {
  constructor(message: string, filterName?: string) {
    super(`Filter error: ${message}${filterName ? ` (Filter: ${filterName})` : ''}`);
    this.name = 'FilterError';
  }
}

// Workflow and automation errors
export class WorkflowError extends CrmError {
  constructor(message: string, workflowId?: number) {
    const workflowInfo = workflowId ? ` (Workflow ID: ${workflowId})` : '';
    super(`Workflow error${workflowInfo}: ${message}`, 400, 'WORKFLOW_ERROR');
    this.name = 'WorkflowError';
  }
}

export class AutomationError extends CrmError {
  constructor(message: string, automationId?: number) {
    const automationInfo = automationId ? ` (Automation ID: ${automationId})` : '';
    super(`Automation error${automationInfo}: ${message}`, 400, 'AUTOMATION_ERROR');
    this.name = 'AutomationError';
  }
}

// Integration errors
export class ThirdPartyIntegrationError extends ExternalServiceError {
  constructor(service: string, message: string) {
    super(service, `Third-party integration error with ${service}: ${message}`, 'THIRD_PARTY_INTEGRATION_ERROR');
    this.name = 'ThirdPartyIntegrationError';
  }
}

export class SyncError extends ExternalServiceError {
  constructor(service: string, message: string) {
    super(service, `Synchronization error with ${service}: ${message}`, 'SYNC_ERROR');
    this.name = 'SyncError';
  }
}

// Utility function to determine if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof CrmError) {
    return error.isOperational;
  }
  return false;
}

// Utility function to create appropriate error from error code
export function createErrorFromCode(errorCode: string, message?: string): CrmError {
  const errorMap: Record<string, typeof CrmError> = {
    VALIDATION_ERROR: ValidationError,
    NOT_FOUND: NotFoundError,
    DUPLICATE_RESOURCE: DuplicateResourceError,
    BUSINESS_RULE_VIOLATION: BusinessRuleError,
    AUTHENTICATION_ERROR: AuthenticationError,
    AUTHORIZATION_ERROR: AuthorizationError,
    RATE_LIMIT_EXCEEDED: RateLimitError,
    DATABASE_ERROR: DatabaseError,
    CONFIGURATION_ERROR: ConfigurationError,
  };

  const ErrorClass = errorMap[errorCode] || CrmError;
  return new ErrorClass(message || `Error: ${errorCode}`);
}

export default {
  CrmError,
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
  // Lead errors
  LeadNotFoundError,
  LeadConversionError,
  DuplicateLeadError,
  // Contact errors
  ContactNotFoundError,
  DuplicateContactError,
  // Company errors
  CompanyNotFoundError,
  DuplicateCompanyError,
  // Opportunity errors
  OpportunityNotFoundError,
  OpportunityStageError,
  // Activity errors
  ActivityNotFoundError,
  ActivityCompletionError,
  // Email campaign errors
  EmailCampaignNotFoundError,
  EmailCampaignError,
  EmailDeliveryError,
  // Access errors
  ContactAccessDeniedError,
  CompanyAccessDeniedError,
  LeadAccessDeniedError,
  // Data processing errors
  DataExportError,
  DataImportError,
  FileProcessingError,
  // Analytics errors
  AnalyticsError,
  ReportGenerationError,
  // Search errors
  SearchError,
  FilterError,
  // Workflow errors
  WorkflowError,
  AutomationError,
  // Integration errors
  ThirdPartyIntegrationError,
  SyncError,
  isOperationalError,
  createErrorFromCode
};