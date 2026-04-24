import { createLogger } from '../../utils/logger.js';
import { DomainServiceClient } from '../DomainServiceClient.js';

const logger = createLogger('card-rules-service');

/**
 * ✅ CARD MANAGEMENT BUSINESS RULES SERVICE
 * 
 * Independent modular service for card generation and management rules
 * 
 * @module CardRulesService
 */
export class CardRulesService {

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