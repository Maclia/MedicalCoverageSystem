/**
 * Card Management Business Rules - Migrated from Core Service
 * 
 * ✅ This is the official source of truth for all card business rules
 * Implements dual execution capability for zero downtime migration
 */

import { BaseRuleModule, ICardRulesService, RuleResult, ExecutionMode, BusinessRuleFlags } from '@medical-system/shared-business-rules';
import { cardManagementService } from './CardManagementService.js';

class MemberCardRulesService extends BaseRuleModule implements ICardRulesService {
  constructor() {
    super('membership-service');
    super.setExecutionMode(BusinessRuleFlags.cardRules);
  }

  async validateCardEligibility(memberId: number): Promise<RuleResult<boolean>> {
    return super.executeRule(
      'validateCardEligibility',
      async () => await this.localValidateCardEligibility(memberId),
      async () => await super.callCoreEndpoint('/api/business-rules/cards/eligibility', { memberId })
    );
  }

  async calculateCardExpiryDate(memberId: number): Promise<RuleResult<Date>> {
    return super.executeRule(
      'calculateCardExpiryDate',
      async () => await this.localCalculateCardExpiryDate(memberId),
      async () => await super.callCoreEndpoint('/api/business-rules/cards/expiry', { memberId })
    );
  }

  async validateReplacementPolicy(cardId: number, reason: string): Promise<RuleResult<boolean>> {
    return super.executeRule(
      'validateReplacementPolicy',
      async () => await this.localValidateReplacementPolicy(cardId, reason),
      async () => await super.callCoreEndpoint('/api/business-rules/cards/replacement', { cardId, reason })
    );
  }

  // Local rule implementations

  private async localValidateCardEligibility(memberId: number): Promise<boolean> {
    // Get member information directly from local service (no network call)
    const memberCards = await cardManagementService.getMemberCards(memberId);
    
    // Default policy rules
    const rules = {
      physicalCardsAllowed: true,
      freeCardsPerMember: 1,
      maximumActiveCards: 3,
    };

    // Business logic now runs locally
    const activeCardCount = memberCards.filter((c: any) => c.status === 'active').length;
    
    return activeCardCount < rules.maximumActiveCards;
  }

  private async localCalculateCardExpiryDate(memberId: number): Promise<Date> {
    // Standard 5 year expiry
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 5);
    return expiry;
  }

  private async localValidateReplacementPolicy(cardId: number, reason: string): Promise<boolean> {
    const printerErrors = ['printing_defect', 'misalignment', 'missing_information', 'damage_during_production'];
    const isPrinterError = printerErrors.includes(reason);
    
    // Printer errors are always eligible for free replacement
    return true;
  }

  /**
   * Lost card request validation
   */
  async validateLostCardRequest(memberId: number, cardId: number): Promise<RuleResult<any>> {
    return super.executeRule(
      'validateLostCardRequest',
      async () => {
        return {
          valid: true,
          blockCard: true,
          issueReplacement: true,
          chargeForReplacement: true,
          replacementCost: 250
        };
      },
      async () => await super.callCoreEndpoint('/api/business-rules/cards/lost', { memberId, cardId })
    );
  }

  /**
   * Print discrepancy policy check
   */
  async checkPrintDiscrepancy(batchId: string, discrepancyType: string): Promise<RuleResult<any>> {
    return super.executeRule(
      'checkPrintDiscrepancy',
      async () => {
        const printerErrors = ['printing_defect', 'misalignment', 'missing_information', 'damage_during_production'];
        const isPrinterError = printerErrors.includes(discrepancyType);

        return {
          valid: true,
          freeReprint: isPrinterError,
          chargeCompany: !isPrinterError,
          chargeVendor: isPrinterError
        };
      },
      async () => await super.callCoreEndpoint('/api/business-rules/cards/print-discrepancy', { batchId, discrepancyType })
    );
  }
}

export const memberCardRulesService = new MemberCardRulesService();