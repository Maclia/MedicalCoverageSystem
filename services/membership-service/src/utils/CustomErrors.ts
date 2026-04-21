export class MembershipError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'MembershipError';
    this.cause = cause;
  }
}

export class ValidationError extends MembershipError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DuplicateMemberError extends MembershipError {
  constructor(field: string) {
    super(`Member with this ${field} already exists`);
    this.name = 'DuplicateMemberError';
  }
}

export class MemberNotFoundError extends MembershipError {
  constructor(memberId: number) {
    super(`Member with ID ${memberId} not found`);
    this.name = 'MemberNotFoundError';
  }
}

export class NotFoundError extends MembershipError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BusinessRuleError extends MembershipError {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class DocumentNotFoundError extends MembershipError {
  constructor(documentId: number) {
    super(`Document with ID ${documentId} not found`);
    this.name = 'DocumentNotFoundError';
  }
}

export class EligibilityError extends MembershipError {
  constructor(message: string) {
    super(`Eligibility check failed: ${message}`);
    this.name = 'EligibilityError';
  }
}

export class CommunicationError extends MembershipError {
  constructor(message: string) {
    super(`Communication error: ${message}`);
    this.name = 'CommunicationError';
  }
}
