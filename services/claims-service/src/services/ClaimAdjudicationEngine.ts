import { createLogger } from '../utils/logger.js';
import { ClaimsService } from './ClaimsService.js';
import { CoreServiceClient } from '../clients/CoreServiceClient.js';

const logger = createLogger('claim-adjudication-engine');

/**
 * ✅ CLAIM ADJUDICATION ENGINE
 * 
 * FINALIZED 6-STAGE ADJUDICATION PIPELINE
 * Implements the complete end-to-end claim processing workflow
 * All validation stages execute in strict sequence
 * Follows industry standard medical claims processing
 */
export class ClaimAdjudicationEngine {

  /**
   * Execute full claim adjudication workflow
   * This is the single entry point for all claim processing
   */
  static async adjudicateClaim(claimData: any): Promise<{
    success: boolean;
    error?: string;
    stage?: string;
    decision?: string;
    metadata?: any;
  }> {
    try {
      logger.info(`Starting adjudication for claim: member=${claimData.memberId}, provider=${claimData.providerId}`);

      // ✅ STAGE 1: Duplicate Claim Detection
      logger.info('STAGE 1/6: Duplicate Claim Detection');
      const duplicateCheck = await ClaimsService.detectDuplicateClaim(claimData);
      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          stage: 'duplicate-detection',
          error: duplicateCheck.error,
          decision: 'REJECTED',
          metadata: { existingClaimId: duplicateCheck.existingClaimId }
        };
      }

      // ✅ STAGE 2: Provider Authorization Verification
      logger.info('STAGE 2/6: Provider Authorization Check');
      const providerAuth = await ClaimsService.verifyProviderAuthorization(claimData.providerId, claimData.benefitId);
      if (!providerAuth.authorized) {
        return {
          success: false,
          stage: 'provider-authorization',
          error: providerAuth.error,
          decision: 'REJECTED'
        };
      }

      // ✅ STAGE 3: Member Eligibility Verification
      logger.info('STAGE 3/6: Member Eligibility Check');
      const eligibility = await ClaimsService.verifyMemberEligibility(
        claimData.memberId,
        new Date(claimData.serviceDate)
      );
      if (!eligibility.eligible) {
        return {
          success: false,
          stage: 'member-eligibility',
          error: eligibility.error,
          decision: 'REJECTED'
        };
      }

      // ✅ STAGE 4: Benefit Balance Check
      logger.info('STAGE 4/6: Benefit Balance Check');
      const balanceCheck = await ClaimsService.checkBenefitBalance(
        claimData.memberId,
        claimData.benefitId,
        claimData.amount
      );
      if (!balanceCheck.available) {
        return {
          success: false,
          stage: 'benefit-balance',
          error: 'Insufficient benefit balance',
          decision: 'PENDING',
          metadata: balanceCheck
        };
      }

      // ✅ STAGE 5: CENTRALIZED BUSINESS RULES VALIDATION (CORE SERVICE)
      logger.info('STAGE 5/6: Centralized Business Rules Engine');
      const businessRuleResult = await CoreServiceClient.validateClaimWithBusinessRules(claimData);
      if (!businessRuleResult.valid) {
        return {
          success: false,
          stage: 'business-rules',
          error: businessRuleResult.error,
          decision: businessRuleResult.requiresAuthorization ? 'PENDING_AUTHORIZATION' : 'REJECTED',
          metadata: {
            ...businessRuleResult.metadata,
            failedRule: businessRuleResult.rule
          }
        };
      }

      // ✅ STAGE 6: FINAL ADJUDICATION & CLAIM CREATION
      logger.info('STAGE 6/6: Final Adjudication & Claim Creation');
      const claim = await ClaimsService.createClaim({
        ...claimData,
        status: 'ADJUDICATED',
        adjudicatedAt: new Date(),
        adjudicationMetadata: {
          businessRulesApplied: businessRuleResult.metadata,
          balanceRemaining: balanceCheck.remainingBalance - claimData.amount
        }
      });

      logger.info(`✅ Claim #${claim.id} successfully adjudicated`);

      return {
        success: true,
        stage: 'complete',
        decision: 'APPROVED',
        metadata: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          adjudicatedAt: claim.adjudicatedAt
        }
      };

    } catch (error: any) {
      logger.error('❌ Claim Adjudication failed:', error);

      // Fail open gracefully - claim will be queued for manual review
      return {
        success: false,
        stage: 'system-error',
        error: 'Claim adjudication encountered an error and has been flagged for manual review',
        decision: 'PENDING_MANUAL_REVIEW',
        metadata: {
          error: error.message
        }
      };
    }
  }

  /**
   * Get adjudication pipeline status for a claim
   */
  static getAdjudicationStatus(claimId: number): any {
    return {
      claimId,
      pipeline: [
        'duplicate-detection',
        'provider-authorization',
        'member-eligibility',
        'benefit-balance',
        'business-rules',
        'complete'
      ]
    };
  }
}
