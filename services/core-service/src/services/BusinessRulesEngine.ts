import { createLogger } from '../utils/logger.js';
import { FinancialRulesService } from './business-rules/FinancialRulesService.js';
import { ClaimRulesService } from './business-rules/ClaimRulesService.js';
import { CardRulesService } from './business-rules/CardRulesService.js';

const logger = createLogger('business-rules-engine');

/**
 * ⚠️  LEGACY COMPATIBILITY FACADE
 * 
 * Backward compatibility layer for existing code
 * All methods delegate to new modular service implementations
 * 
 * @deprecated Use direct imports from ./business-rules/ instead
 * This facade will be removed in v2.0
 * 
 * @module BusinessRulesEngine
 */
export class BusinessRulesEngine {

  // ==============================================
  // ✅ CLAIM RULES - DELEGATED
  // ==============================================

  static async validateClaim(claimData: any): Promise<any> {
    logger.warn('⚠️  Deprecation Warning: BusinessRulesEngine.validateClaim() is deprecated. Use ClaimRulesService.validateClaim() instead');
    return ClaimRulesService.validateClaim(claimData);
  }

  static async checkPolicyExclusions(claimData: any): Promise<any> {
    return ClaimRulesService.checkPolicyExclusions(claimData);
  }

  static async checkWaitingPeriods(claimData: any): Promise<any> {
    return ClaimRulesService.checkWaitingPeriods(claimData);
  }

  static async checkDiagnosisCodes(claimData: any): Promise<any> {
    return ClaimRulesService.checkDiagnosisCodes(claimData);
  }

  static async checkPreAuthorizationRequirements(claimData: any): Promise<any> {
    return ClaimRulesService.checkPreAuthorizationRequirements(claimData);
  }

  static async calculateCopayAndDeductible(claimData: any): Promise<any> {
    return ClaimRulesService.calculateCopayAndDeductible(claimData);
  }

  static async checkAutoApprovalThresholds(claimData: any): Promise<any> {
    return ClaimRulesService.checkAutoApprovalThresholds(claimData);
  }

  // ==============================================
  // ✅ CARD RULES - DELEGATED
  // ==============================================

  static async validateCardEligibility(memberId: number, cardType: string): Promise<any> {
    logger.warn('⚠️  Deprecation Warning: BusinessRulesEngine.validateCardEligibility() is deprecated. Use CardRulesService.validateCardEligibility() instead');
    return CardRulesService.validateCardEligibility(memberId, cardType);
  }

  static async validateLostCardRequest(memberId: number, cardId: number): Promise<any> {
    return CardRulesService.validateLostCardRequest(memberId, cardId);
  }

  static async checkPrintDiscrepancy(batchId: string, discrepancyType: string): Promise<any> {
    return CardRulesService.checkPrintDiscrepancy(batchId, discrepancyType);
  }

  // ==============================================
  // ✅ FINANCIAL RULES - DELEGATED
  // ==============================================

  static async calculatePremiumAllocation(premiumAmount: number, schemeDetails?: any): Promise<any> {
    logger.warn('⚠️  Deprecation Warning: BusinessRulesEngine.calculatePremiumAllocation() is deprecated. Use FinancialRulesService.calculatePremiumAllocation() instead');
    return FinancialRulesService.calculatePremiumAllocation(premiumAmount, schemeDetails);
  }

  static async validateCompanyBalance(companyId: number, claimAmount: number): Promise<any> {
    return FinancialRulesService.validateCompanyBalance(companyId, claimAmount);
  }

  static async calculateCommission(baseAmount: number, commissionType: string, performanceMetrics?: any): Promise<any> {
    return FinancialRulesService.calculateCommission(baseAmount, commissionType, performanceMetrics);
  }

  static async getSettlementWindow(providerType: string, claimAmount: number): Promise<any> {
    return FinancialRulesService.getSettlementWindow(providerType, claimAmount);
  }

  static validateDoubleEntry(debitAmount: number, creditAmount: number, tolerance: number = 0.01): boolean {
    return FinancialRulesService.validateDoubleEntry(debitAmount, creditAmount, tolerance);
  }

  static isValidPaymentStatusTransition(currentStatus: string, newStatus: string): boolean {
    return FinancialRulesService.isValidPaymentStatusTransition(currentStatus, newStatus);
  }
}