/**
 * Official User Roles enum matching the core service definition
 * All roles used in insurance service must be listed here
 */
export enum UserRole {
  INSURANCE = 'insurance',
  INSTITUTION = 'institution',
  PROVIDER = 'provider',
  SALES_ADMIN = 'sales_admin',
  SALES_MANAGER = 'sales_manager',
  TEAM_LEAD = 'team_lead',
  SALES_AGENT = 'sales_agent',
  BROKER = 'broker',
  UNDERWRITER = 'underwriter',
  SENIOR_UNDERWRITER = 'senior_underwriter',
  MEMBER = 'member',
  ADMIN = 'admin'
}

/**
 * Valid roles that have access to insurance service operations
 */
export const INSURANCE_ALLOWED_ROLES = [
  UserRole.INSURANCE,
  UserRole.UNDERWRITER,
  UserRole.SENIOR_UNDERWRITER,
  UserRole.ADMIN,
  UserRole.SALES_ADMIN,
  UserRole.SALES_MANAGER
] as const;

/**
 * Roles authorized to approve insurance schemes
 */
export const SCHEME_APPROVAL_ROLES = [
  UserRole.SENIOR_UNDERWRITER,
  UserRole.ADMIN
] as const;