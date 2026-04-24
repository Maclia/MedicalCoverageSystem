import { createLogger } from '../../utils/logger.js';
import { DomainServiceClient } from '../DomainServiceClient.js';

const logger = createLogger('financial-rules-service');

/**
 * ✅ FINANCIAL BUSINESS RULES SERVICE
 * 
 * Single Source of Truth for all financial calculations and validations
 * Independent modular service with pure domain logic
 * 
 * @module FinancialRulesService
 */
export class FinancialRulesService {

  /**
   * Premium Allocation Business Rules
   * Standardized premium splitting ratios across entire system
   */
  static async calculatePremiumAllocation(premiumAmount: number, schemeDetails?: any): Promise<{
    providerShare: number;
    companyShare: number;
    riskReserve: number;
    administrativeCost: number;
    breakdown: {
      providerPercentage: number;
      companyPercentage: number;
      reservePercentage: number;
      adminPercentage: number;
    };
  }> {
    // Standard allocation ratios - can be overridden per scheme
    const ratios = {
      providerPercentage: 0.70,   // 70% to provider pool
      companyPercentage: 0.15,    // 15% company share
      reservePercentage: 0.10,    // 10% risk reserve
      adminPercentage: 0.05       // 5% administrative costs
    };

    // Apply scheme specific overrides if available
    if (schemeDetails?.allocationRatios) {
      Object.assign(ratios, schemeDetails.allocationRatios);
    }

    // Calculate actual amounts
    return {
      providerShare: premiumAmount * ratios.providerPercentage,
      companyShare: premiumAmount * ratios.companyPercentage,
      riskReserve: premiumAmount * ratios.reservePercentage,
      administrativeCost: premiumAmount * ratios.adminPercentage,
      breakdown: ratios
    };
  }

  /**
   * Company Balance Validation
   * Checks if company has sufficient balance for claim settlement
   * This rule is enforced before ANY claim approval
   */
  static async validateCompanyBalance(companyId: number, claimAmount: number): Promise<{
    valid: boolean;
    sufficientBalance: boolean;
    currentBalance: number;
    requiredBalance: number;
    availableAfterClaim: number;
    thresholdBreached: boolean;
    requiresManualApproval: boolean;
  }> {
    try {
      // Get real-time balance from finance service
      const financeServiceUrl = process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007';
      const balanceResult = await DomainServiceClient.callService(financeServiceUrl, `/api/finance/companies/${companyId}/balance`, {});
      
      const currentBalance = balanceResult.balance || 0;
      const minimumBalanceThreshold = 10000; // Minimum operating balance
      
      const availableAfterClaim = currentBalance - claimAmount;
      const sufficientBalance = availableAfterClaim >= 0;
      const thresholdBreached = availableAfterClaim < minimumBalanceThreshold;
      
      return {
        valid: sufficientBalance,
        sufficientBalance,
        currentBalance,
        requiredBalance: claimAmount,
        availableAfterClaim,
        thresholdBreached,
        requiresManualApproval: thresholdBreached && sufficientBalance
      };

    } catch (error: any) {
      logger.error('Company balance validation failed:', error);
      // Fail closed for financial validation - balance checks are critical
      return {
        valid: false,
        sufficientBalance: false,
        currentBalance: 0,
        requiredBalance: claimAmount,
        availableAfterClaim: 0,
        thresholdBreached: true,
        requiresManualApproval: true
      };
    }
  }

  /**
   * Commission Calculation Rules
   * Standardized commission rates across all services
   */
  static async calculateCommission(baseAmount: number, commissionType: string, performanceMetrics?: any): Promise<{
    commissionRate: number;
    commissionAmount: number;
    calculationDetails: any;
  }> {
    // Base rates
    const baseRates: Record<string, number> = {
      'referral': 0.05,      // 5% referral bonus
      'service': 0.07,       // 7% service commission
      'performance': 0.10,   // 10% performance bonus
      'emergency': 0.08      // 8% emergency services
    };

    let rate = baseRates[commissionType] || baseRates.service;

    // Apply volume bonus
    if (performanceMetrics?.volume30Days > 50000) {
      rate += 0.02;
    }

    // Apply performance bonus
    if (performanceMetrics?.patientCount > 100) {
      rate += 0.01;
    }

    // Maximum cap
    rate = Math.min(rate, 0.15);

    // Minimum commission amount
    const amount = Math.max(baseAmount * rate, 50);

    return {
      commissionRate: rate,
      commissionAmount: amount,
      calculationDetails: {
        baseRate: baseRates[commissionType],
        volumeBonus: performanceMetrics?.volume30Days > 50000 ? 0.02 : 0,
        performanceBonus: performanceMetrics?.patientCount > 100 ? 0.01 : 0,
        finalRate: rate,
        minimumApplied: amount === 50
      }
    };
  }

  /**
   * Settlement Window Rules
   * Determines when provider payments are released
   */
  static async getSettlementWindow(providerType: string, claimAmount: number): Promise<{
    settlementDays: number;
    immediateRelease: boolean;
    requiresBatch: boolean;
    batchCycle: string;
  }> {
    // Settlement rules matrix
    if (claimAmount > 100000) {
      return {
        settlementDays: 1,
        immediateRelease: true,
        requiresBatch: false,
        batchCycle: 'immediate'
      };
    }

    if (providerType === 'hospital') {
      return {
        settlementDays: 2,
        immediateRelease: false,
        requiresBatch: true,
        batchCycle: 'daily'
      };
    }

    if (providerType === 'clinic') {
      return {
        settlementDays: 3,
        immediateRelease: false,
        requiresBatch: true,
        batchCycle: 'twice_weekly'
      };
    }

    // Default for individual providers
    return {
      settlementDays: 7,
      immediateRelease: false,
      requiresBatch: true,
      batchCycle: 'weekly'
    };
  }

  /**
   * Double Entry Bookkeeping Validation
   * Ensures every financial transaction balances correctly
   */
  static validateDoubleEntry(debitAmount: number, creditAmount: number, tolerance: number = 0.01): boolean {
    return Math.abs(debitAmount - creditAmount) <= tolerance;
  }

  /**
   * Payment Status Transition Rules
   * Enforces valid payment state transitions
   */
  static isValidPaymentStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['processing', 'failed', 'cancelled'],
      'processing': ['completed', 'failed'],
      'completed': ['refunded'],
      'failed': ['pending'],
      'refunded': [],
      'cancelled': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}