/**
 * Claim Status Enumeration
 * Standardized status values used throughout the claims lifecycle
 */
export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_INFORMATION = 'PENDING_INFORMATION',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

/**
 * Claim Permissions Enumeration
 * Standard permission names for role-based access control
 */
export enum ClaimPermissions {
  CREATE = 'claim:create',
  READ = 'claim:read',
  UPDATE = 'claim:update',
  DELETE = 'claim:delete',
  SUBMIT = 'claim:submit',
  APPROVE = 'claim:approve',
  ADJUDICATE = 'claim:adjudicate',
  VIEW_STATS = 'claim:view_stats'
}

/**
 * Membership Status Enumeration
 */
export enum MembershipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING = 'pending'
}

/**
 * Provider Status Enumeration
 */
export enum ProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  BLACKLISTED = 'blacklisted'
}

/**
 * Provider Verification Status Enumeration
 */
export enum VerificationStatus {
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  FAILED = 'failed'
}