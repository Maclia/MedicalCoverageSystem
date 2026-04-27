/**
 * Unified Claims Service - Facade Pattern
 * Re-exports all claim operations from specialized services for backward compatibility
 * 
 * This file maintains the original ClaimsService API while delegating
 * implementation to focused smaller service classes.
 * 
 * All existing imports and code that uses ClaimsService will continue to work
 * exactly as before.
 */
import { ClaimManagementService } from './ClaimManagementService.js';
import { ClaimValidationService } from './ClaimValidationService.js';
import { ClaimAssignmentService } from './ClaimAssignmentService.js';

export class ClaimsService {
  // =============================================
  // Claim Management (CRUD Operations)
  // =============================================
  static createClaim = ClaimManagementService.createClaim;
  static getClaims = ClaimManagementService.getClaims;
  static getClaimById = ClaimManagementService.getClaimById;
  static updateClaimStatus = ClaimManagementService.updateClaimStatus;
  static deleteClaim = ClaimManagementService.deleteClaim;

  // =============================================
  // Claim Validation Rules
  // =============================================
  static checkBenefitBalance = ClaimValidationService.checkBenefitBalance;
  static verifyMemberEligibility = ClaimValidationService.verifyMemberEligibility;
  static verifyProviderAuthorization = ClaimValidationService.verifyProviderAuthorization;
  static detectDuplicateClaim = ClaimValidationService.detectDuplicateClaim;

  // =============================================
  // Claim Assignment System
  // =============================================
  static assignClaimToReviewer = ClaimAssignmentService.assignClaimToReviewer;
  static autoAssignPendingClaims = ClaimAssignmentService.autoAssignPendingClaims;
  static getReviewerClaims = ClaimAssignmentService.getReviewerClaims;
}