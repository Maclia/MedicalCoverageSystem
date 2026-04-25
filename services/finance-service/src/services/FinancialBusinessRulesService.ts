/**
 * Financial Business Rules - Migrated from Core Service
 * 
 * ✅ Official source of truth for all financial calculations, validation and policies
 * Implements dual execution capability for zero downtime migration
 */

import { BaseRuleModule, IFinancialRulesService, RuleResult, ExecutionMode } from '@medical-system/shared-business-rules';
import { companyBalanceService } from './CompanyBalanceService.js';

class FinancialBusinessRulesService extends BaseRuleModule implements IFinancialRulesService {
  constructor() {
    super('finance-service');
    super.setExecutionMode(ExecutionMode.DUAL);
  }

  async calculatePremiumAllocation(amount: number): Promise<RuleResult<Record<string, number>>> {
    return super.executeRule(
      'calculatePremiumAllocation',
      async () => await this.localCalculatePremiumAllocation(amount),
      async () => await super.callCoreEndpoint('/api/business-rules/finance/premium-allocation', { amount })
    );
  }

  async validateCompanyBalance(companyId: number, claimAmount: number): Promise<RuleResult<boolean>> {
    return super.executeRule(
      'validateCompanyBalance',
      async () => await this.localValidateCompanyBalance(companyId, claimAmount),
      async () => await super.callCoreEndpoint('/api/business-rules/finance/company-balance', { companyId, claimAmount })
    );
  }

  async calculateCommission(transactionAmount: number): Promise<RuleResult<number>> {
    return super.executeRule(
      'calculateCommission',
      async () => await this.localCalculateCommission(transactionAmount),
      async () => await super.callCoreEndpoint('/api/business-rules/finance/commission', { transactionAmount })
    );
  }

  async calculateSettlementAmount(claimAmount: number): Promise<RuleResult<number>> {
    return super.executeRule(
      'calculateSettlementAmount',
      async () => claimAmount * 0.95,
      async () => await super.callCoreEndpoint('/api/business-rules/finance/settlement-amount', { claimAmount })
    );
  }

  // Local rule implementations

  private async localCalculatePremiumAllocation(premiumAmount: number): Promise<Record<string, number>> {
    // Standard allocation ratios - can be overridden per scheme
    const ratios = {
      providerPercentage: 0.70,
      companyPercentage: 0.15,
      reservePercentage: 0.10,
      adminPercentage: 0.05
    };

    return {
      providerShare: premiumAmount * ratios.providerPercentage,
      companyShare: premiumAmount * ratios.companyPercentage,
      riskReserve: premiumAmount * ratios.reservePercentage,
      administrativeCost: premiumAmount * ratios.adminPercentage,
      ...ratios
    };
  }

  private async localValidateCompanyBalance(companyId: number, claimAmount: number): Promise<boolean> {
    // Get balance directly from local service with NO network call
    const balanceData = await companyBalanceService.getCompanyBalance(String(companyId));
    
    const minimumBalanceThreshold = 10000;
    const availableAfterClaim = balanceData.currentBalance - claimAmount;
    
    return availableAfterClaim >= 0;
  }

  private async localCalculateCommission(baseAmount: number): Promise<number> {
    const baseRate = 0.07;
    const rate = Math.min(baseRate, 0.15);
    
    // Minimum commission amount
    return Math.max(baseAmount * rate, 50);
  }

  /**
   * Full settlement window rules
   */
  async getSettlementWindow(providerType: string, claimAmount: number): Promise<RuleResult<any>> {
    return super.executeRule(
      'getSettlementWindow',
      async () => {
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

        return {
          settlementDays: 7,
          immediateRelease: false,
          requiresBatch: true,
          batchCycle: 'weekly'
        };
      },
      async () => await super.callCoreEndpoint('/api/business-rules/finance/settlement-window', { providerType, claimAmount })
    );
  }

  /**
   * Double entry bookkeeping validation
   */
  validateDoubleEntry(debitAmount: number, creditAmount: number, tolerance: number = 0.01): boolean {
    return Math.abs(debitAmount - creditAmount) <= tolerance;
  }

  /**
   * Payment status transition validation
   */
  isValidPaymentStatusTransition(currentStatus: string, newStatus: string): boolean {
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

export const financialBusinessRulesService = new FinancialBusinessRulesService();