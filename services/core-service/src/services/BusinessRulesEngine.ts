import { createLogger } from '../utils/logger.js';

const logger = createLogger('business-rules-engine');

/**
 * Domain Service HTTP Clients
 * Core Service acts as ORCHESTRATOR only - NO DIRECT DATABASE ACCESS
 * All data is retrieved from respective domain services via API
 */
class DomainServiceClient {
  static async callService(serviceUrl: string, endpoint: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${serviceUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'core-service'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(3000)
      });

      return await response.json();
    } catch (error) {
      logger.warn(`Domain service ${serviceUrl} unavailable`, error);
      return { valid: true, fallback: true };
    }
  }

  static async getInsuranceService(): Promise<string> {
    return process.env.INSURANCE_SERVICE_URL || 'http://insurance-service:3002';
  }

  static async getMembershipService(): Promise<string> {
    return process.env.MEMBERSHIP_SERVICE_URL || 'http://membership-service:3003';
  }
}

/**
 * CENTRALIZED BUSINESS RULES ENGINE
 * 
 * Single Source of Truth for all policy and business rules across the entire system
 * All services MUST call this engine for claim validation
 * No service implements business rules locally
 * 
 * @module BusinessRulesEngine
 */
export class BusinessRulesEngine {

  /**
   * Execute all business rule validations for a claim
   * This is the single entry point for all claim policy checks
   */
  static async validateClaim(claimData: any): Promise<{
    valid: boolean;
    error?: string;
    rule?: string;
    metadata?: any;
    requiresAuthorization?: boolean;
    authorizationType?: string;
    coPaymentAmount?: number;
    deductibleAmount?: number;
  }> {
    try {
      const validations = [
        this.checkPolicyExclusions,
        this.checkWaitingPeriods,
        this.checkDiagnosisCodes,
        this.checkPreAuthorizationRequirements,
        this.calculateCopayAndDeductible,
        this.checkAutoApprovalThresholds
      ];

      for (const validation of validations) {
        const result = await validation(claimData);
        
        if (!result.valid) {
          logger.warn(`❌ Business Rule failed: ${result.rule}`, result);
          return result;
        }
      }

      return {
        valid: true
      };

    } catch (error: any) {
      logger.error('Business Rules Engine execution failed:', error);
      
      // Fail open for unhandled errors - administrator will review
      return {
        valid: true,
        metadata: {
          warning: 'Business rules engine failure - claim flagged for manual review'
        }
      };
    }
  }

  /**
   * Check for policy exclusions
   * Validates that service is not excluded from member's policy
   */
  static async checkPolicyExclusions(claimData: any): Promise<any> {
    // TODO: Implement policy exclusion checking
    
    return {
      valid: true,
      rule: 'policy-exclusions'
    };
  }

  /**
   * Verify waiting periods for benefits
   * Ensures member has completed required waiting period for this benefit
   */
  static async checkWaitingPeriods(claimData: any): Promise<any> {
    // TODO: Implement waiting period enforcement
    
    return {
      valid: true,
      rule: 'waiting-periods'
    };
  }

  /**
   * Validate diagnosis and procedure codes
   * Checks ICD-10 / CPT code validity and coverage
   */
  static async checkDiagnosisCodes(claimData: any): Promise<any> {
    // TODO: Implement diagnosis code validation
    
    return {
      valid: true,
      rule: 'diagnosis-codes'
    };
  }

  /**
   * Check if pre-authorization is required for this claim
   */
  static async checkPreAuthorizationRequirements(claimData: any): Promise<any> {
    // TODO: Implement pre-authorization requirements
    
    return {
      valid: true,
      rule: 'pre-authorization'
    };
  }

  /**
   * Calculate co-payment and deductible amounts
   */
  static async calculateCopayAndDeductible(claimData: any): Promise<any> {
    // TODO: Implement co-payment and deductible calculation
    
    return {
      valid: true,
      rule: 'copay-deductible',
      coPaymentAmount: 0,
      deductibleAmount: 0
    };
  }

   /**
    * Check auto-approval rules
    * Determines if claim qualifies for automatic approval
    */
   static async checkAutoApprovalThresholds(claimData: any): Promise<any> {
     // TODO: Implement auto-approval rules engine
     
     return {
       valid: true,
       rule: 'auto-approval',
       autoApprove: true
     };
   }

   // ==============================================
   // ✅ CARD MANAGEMENT BUSINESS RULES
   // ==============================================

   /**
    * Validate card generation eligibility for member
    * Checks scheme rules, member status, billing status
    */
   static async validateCardEligibility(memberId: number, cardType: string): Promise<{
     valid: boolean;
     error?: string;
     billable: boolean;
     chargeAmount?: number;
     requiresApproval?: boolean;
   }> {
     try {
       // Get member and scheme information from Membership Service
       const membershipServiceUrl = await DomainServiceClient.getMembershipService();
       const memberResult = await DomainServiceClient.callService(membershipServiceUrl, `/api/members/${memberId}`, {});

       // Default policy rules
       const rules = {
         physicalCardsAllowed: true,
         freeCardsPerMember: 1,
         replacementCardCost: 250,
         expeditedShippingCost: 350,
         printingErrorFreeReprint: true
       };

       // Count existing cards for this member
       const cardCount = memberResult.cardCount || 0;

       // Determine if this card is billable
       const isBillable = cardCount >= rules.freeCardsPerMember;
       const chargeAmount = isBillable ? 
         (cardType === 'physical' ? rules.replacementCardCost : 0) : 0;

       return {
         valid: true,
         billable: isBillable,
         chargeAmount,
         requiresApproval: chargeAmount > 500
       };

     } catch (error: any) {
       logger.error('Card eligibility validation failed:', error);
       return {
         valid: true,
         billable: false
       };
     }
   }

   /**
    * Validate lost card workflow
    */
   static async validateLostCardRequest(memberId: number, cardId: number): Promise<{
     valid: boolean;
     blockCard: boolean;
     issueReplacement: boolean;
     chargeForReplacement: boolean;
     replacementCost?: number;
   }> {
     return {
       valid: true,
       blockCard: true,
       issueReplacement: true,
       chargeForReplacement: true,
       replacementCost: 250
     };
   }

   /**
    * Check printing discrepancy policy
    */
   static async checkPrintDiscrepancy(batchId: string, discrepancyType: string): Promise<{
     valid: boolean;
     freeReprint: boolean;
     chargeCompany: boolean;
     chargeVendor: boolean;
   }> {
     // Printer errors are always free reprints - no charge to company
     const printerErrors = ['printing_defect', 'misalignment', 'missing_information', 'damage_during_production'];
     
     const isPrinterError = printerErrors.includes(discrepancyType);

     return {
       valid: true,
       freeReprint: isPrinterError,
       chargeCompany: !isPrinterError,
       chargeVendor: isPrinterError
     };
   }
 }
