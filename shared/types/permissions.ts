/**
 * Universal System Permissions using TypeScript Template Literal Types
 *
 * Works for ALL modules, ALL services, client + server
 * Zero runtime overhead - 100% compile-time safety
 */

// ==============================================
// CORE SYSTEM PATTERN (one single line)
// ==============================================
export type Entity = 'claim' | 'policy' | 'member' | 'payment' | 'scheme' | 'company' | 'user' | 'report';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve';
export type Permission = `${Entity}:${Action}`;

// ==============================================
// ALL SYSTEM MODULES
// ==============================================
export type Module =
  | 'billing'
  | 'claims'
  | 'crm'
  | 'insurance'
  | 'membership'
  | 'finance'
  | 'analytics'
  | 'hospital'
  | 'wellness'
  | 'fraud'
  | 'core'
  | 'gateway';

export type ModuleAccess = `module:${Module}`;

// ==============================================
// MODULE SPECIFIC EXTENSIONS
// ==============================================

// Billing Module
export type BillingEntity = 'invoice' | 'payment' | 'commission' | 'transaction' | 'token';
export type BillingAction = 'refund' | 'reconcile' | 'charge' | 'writeoff' | 'void';
export type BillingPermission = `${BillingEntity}:${BillingAction}`;

// Claims Module
export type ClaimsEntity = 'claim' | 'preauth' | 'eob' | 'assessment';
export type ClaimsAction = 'adjudicate' | 'assign' | 'escalate' | 'audit' | 'validate';
export type ClaimsPermission = `${ClaimsEntity}:${ClaimsAction}`;

// CRM Module
export type CrmEntity = 'lead' | 'client' | 'quote' | 'opportunity' | 'campaign';
export type CrmAction = 'convert' | 'followup' | 'assign' | 'score' | 'qualify';
export type CrmPermission = `${CrmEntity}:${CrmAction}`;

// Insurance Module
export type InsuranceEntity = 'scheme' | 'policy' | 'benefit' | 'premium' | 'renewal';
export type InsuranceAction = 'activate' | 'suspend' | 'renew' | 'cancel' | 'underwrite';
export type InsurancePermission = `${InsuranceEntity}:${InsuranceAction}`;

// Hospital Module
export type HospitalEntity = 'patient' | 'visit' | 'preauthorization' | 'procedure' | 'diagnosis';
export type HospitalAction = 'admit' | 'discharge' | 'verify' | 'authorize' | 'refer';
export type HospitalPermission = `${HospitalEntity}:${HospitalAction}`;

// ==============================================
// UNIVERSAL TYPES
// ==============================================
export type AnyPermission = `${string}:${string}`;
export type SystemPermission = Permission | ModuleAccess | BillingPermission | ClaimsPermission | CrmPermission | InsurancePermission | HospitalPermission | AnyPermission;

// ==============================================
// TYPE UTILITIES
// ==============================================
export type ExtractResource<T> = T extends `${infer R}:${string}` ? R : never;
export type ExtractAction<T> = T extends `${string}:${infer A}` ? A : never;
export type IsValidPermission<T> = T extends SystemPermission ? true : false;

// ==============================================
// RUNTIME VALIDATION GUARD
// ==============================================

/**
 * Runtime validation guard for system permissions
 * Validates that a string matches the permission format pattern
 * Provides type narrowing for SystemPermission
 */
export function isValidPermission(permission: string): permission is SystemPermission {
  if (typeof permission !== 'string') return false;
  
  const parts = permission.split(':');
  if (parts.length !== 2) return false;
  
  const [resource, action] = parts;
  if (!resource || !action) return false;
  
  // Check basic format requirements
  return /^[a-z]+$/.test(resource) && /^[a-z]+$/.test(action);
}

/**
 * Validates an array of permissions at runtime
 */
export function validatePermissions(permissions: string[]): permissions is SystemPermission[] {
  return permissions.every(isValidPermission);
}
