/**
 * Legacy Premium Calculator
 *
 * Backward compatibility layer for existing premium calculation functionality
 * This maintains the original API while leveraging the enhanced calculation engine
 */

import { calculateRiskAdjustedPremium, PremiumCalculationInput } from './premiumCalculator';
import { calculateActuarialRates } from '../engines/actuarialEngine';

export interface LegacyPremiumInput {
  // Original premium calculation inputs
  memberCount: number;
  periodId: number;
  rateType: 'standard' | 'age_banded' | 'family_size';
  ageDistribution?: Array<{ age: number; count: number }>;
  familyComposition?: {
    principal: number;
    spouse: number;
    children: number;
  };
  // Regional and demographic factors
  regionId?: string;
  industryType?: string;
  companySize?: number;
}

export interface LegacyPremiumResult {
  // Original premium calculation output format
  basePremium: number;
  adjustedPremium: number;
  totalPremium: number;
  memberPremium: number;
  breakdown: {
    principal: number;
    spouse: number;
    children: number;
  };
  factors: {
    demographic: number;
    regional: number;
    adjustment: number;
  };
}

/**
 * Legacy Premium Calculator Class
 * Maintains compatibility with existing code while using enhanced engine
 */
export class PremiumCalculator {
  /**
   * Calculate premium using legacy interface
   * @param input Legacy premium calculation input
   * @returns Legacy premium calculation result
   */
  async calculatePremium(input: LegacyPremiumInput): Promise<LegacyPremiumResult> {
    try {
      // Convert legacy input to enhanced input format
      const enhancedInput: PremiumCalculationInput = {
        member: {
          id: 0, // Legacy compatibility
          age: 35, // Default age for calculation
          gender: 'all',
          dependents: input.familyComposition ?
            input.familyComposition.spouse + input.familyComposition.children : 0
        },
        coverage: {
          planType: 'ppo', // Default plan type
          coverageLevel: 'standard',
          effectiveDate: new Date(),
          regionId: input.regionId || 'US-NAT'
        },
        demographics: {
          age: 35,
          gender: 'all',
          location: input.regionId || 'US-NAT',
          familySize: input.memberCount,
          smokerStatus: false
        },
        riskFactors: {
          healthScore: 1.0, // Neutral risk for legacy compatibility
          lifestyleScore: 1.0,
          occupationalRisk: 'low'
        },
        marketData: {
          competitiveIndex: 1.0,
          marketSegment: input.industryType || 'general',
          companySize: input.companySize || 100
        }
      };

      // Use enhanced calculation engine
      const enhancedResult = await calculateRiskAdjustedPremium(enhancedInput);

      // Convert enhanced result back to legacy format
      const legacyResult: LegacyPremiumResult = {
        basePremium: enhancedResult.basePremium,
        adjustedPremium: enhancedResult.adjustedPremium,
        totalPremium: enhancedResult.finalPremium,
        memberPremium: enhancedResult.finalPremium / input.memberCount,
        breakdown: {
          principal: enhancedResult.breakdown.basePremium,
          spouse: enhancedResult.breakdown.riskAdjustment,
          children: enhancedResult.breakdown.healthcareInflation
        },
        factors: {
          demographic: enhancedResult.adjustments.demographic || 1.0,
          regional: enhancedResult.adjustments.regional || 1.0,
          adjustment: enhancedResult.riskAdjustmentFactor || 1.0
        }
      };

      return legacyResult;
    } catch (error) {
      console.error('Error in legacy premium calculation:', error);
      // Fallback to simple calculation for compatibility
      return this.calculateFallbackPremium(input);
    }
  }

  /**
   * Fallback calculation for legacy compatibility
   * @param input Legacy premium input
   * @returns Simple premium result
   */
  private calculateFallbackPremium(input: LegacyPremiumInput): LegacyPremiumResult {
    const baseRate = 500; // $500 base rate per member
    const adjustmentFactor = this.getAdjustmentFactor(input);
    const totalPremium = baseRate * input.memberCount * adjustmentFactor;

    return {
      basePremium: baseRate * input.memberCount,
      adjustedPremium: totalPremium,
      totalPremium,
      memberPremium: baseRate * adjustmentFactor,
      breakdown: {
        principal: totalPremium * 0.6,
        spouse: totalPremium * 0.3,
        children: totalPremium * 0.1
      },
      factors: {
        demographic: 1.0,
        regional: 1.0,
        adjustment: adjustmentFactor
      }
    };
  }

  /**
   * Get adjustment factor for legacy calculation
   * @param input Legacy premium input
   * @returns Adjustment factor
   */
  private getAdjustmentFactor(input: LegacyPremiumInput): number {
    let factor = 1.0;

    // Regional adjustment
    if (input.regionId) {
      // Simple regional mapping for legacy compatibility
      const regionalFactors: Record<string, number> = {
        'CA-LOS': 1.45,
        'CA-SF': 1.68,
        'NY-NYC': 1.72,
        'TX-DFW': 1.18,
        'FL-MIA': 1.35
      };
      factor *= regionalFactors[input.regionId] || 1.0;
    }

    // Size adjustment
    if (input.companySize) {
      if (input.companySize > 1000) factor *= 0.9; // Large companies get discount
      else if (input.companySize < 50) factor *= 1.1; // Small companies pay more
    }

    return factor;
  }

  /**
   * Validate premium calculation data
   * @param input Premium calculation input
   * @returns Validation result
   */
  validatePremiumData(input: LegacyPremiumInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.memberCount || input.memberCount <= 0) {
      errors.push('Member count must be positive');
    }

    if (!input.periodId || input.periodId <= 0) {
      errors.push('Period ID must be positive');
    }

    if (!['standard', 'age_banded', 'family_size'].includes(input.rateType)) {
      errors.push('Invalid rate type');
    }

    if (input.ageDistribution && input.ageDistribution.length === 0) {
      errors.push('Age distribution cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Legacy premium calculation function
 * @param input Legacy premium calculation input
 * @returns Promise resolving to premium result
 */
export async function calculatePremium(input: LegacyPremiumInput): Promise<LegacyPremiumResult> {
  const calculator = new PremiumCalculator();
  return await calculator.calculatePremium(input);
}

/**
 * Validate premium calculation data
 * @param input Premium calculation input
 * @returns Validation result
 */
export function validatePremiumData(input: LegacyPremiumInput): { isValid: boolean; errors: string[] } {
  const calculator = new PremiumCalculator();
  return calculator.validatePremiumData(input);
}

// Export default calculator instance for convenience
export const premiumCalculator = new PremiumCalculator();