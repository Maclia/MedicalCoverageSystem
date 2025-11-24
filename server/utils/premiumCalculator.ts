/**
 * Premium calculator utility functions
 * Enhanced with risk-adjusted pricing and actuarial models while maintaining backward compatibility
 */
import { IStorage } from '../storage';
import * as schema from '@shared/schema';
import { getActivePeriod, countMembersByType, getLatestPremium } from './dbOperations';
import {
  calculateRiskAdjustedPremium,
  PremiumCalculationInput,
  PremiumResult,
  DemographicData,
  FamilyComposition,
  HistoricalClaimsData
} from './enhancedPremiumCalculator';

// Premium calculation options interface
export interface PremiumCalculationOptions {
  methodology?: 'standard' | 'risk-adjusted' | 'hybrid';
  includeRiskAdjustment?: boolean;
  demographicData?: DemographicData;
  familyComposition?: FamilyComposition;
  historicalClaims?: HistoricalClaimsData;
  geographicRegion?: string;
  projectionYear?: number;
  dataQuality?: number;
  fallbackToStandard?: boolean; // Default: true for backward compatibility
}

/**
 * Calculate premium for a company based on members and premium rates
 * Enhanced with optional risk-adjusted pricing
 */
export async function calculatePremium(
  storage: IStorage,
  companyId: number,
  periodId?: number,
  options?: PremiumCalculationOptions
): Promise<schema.InsertPremium> {
  // Get active period if periodId not provided
  let activePeriod;
  if (!periodId) {
    activePeriod = await getActivePeriod();
    if (!activePeriod) {
      throw new Error('No active period found');
    }
    periodId = activePeriod.id;
  } else {
    activePeriod = await storage.getPeriod(periodId);
    if (!activePeriod) {
      throw new Error(`Period with ID ${periodId} not found`);
    }
  }
  
  // Get premium rates for the period
  const rates = await storage.getPremiumRateByPeriod(periodId);
  if (!rates) {
    throw new Error(`Premium rates not found for period ID ${periodId}`);
  }
  
  // Count members by type for the company
  const counts = await countMembersByType(companyId);

  let subtotal: number;
  let total: number;
  let enhancedCalculation: PremiumResult | null = null;

  // Determine calculation methodology
  const methodology = options?.methodology || 'standard';
  const includeRiskAdjustment = options?.includeRiskAdjustment || false;

  try {
    // Use enhanced calculation if requested and data is available
    if ((methodology === 'risk-adjusted' || methodology === 'hybrid') && includeRiskAdjustment) {
      // Get member IDs for risk assessment
      const companyMembers = await storage.getMembersByCompany(companyId);
      const memberIds = companyMembers.map(member => member.id);

      // Prepare enhanced calculation input
      const enhancedInput: PremiumCalculationInput = {
        companyId,
        periodId,
        memberIds,
        includeRiskAdjustment: true,
        geographicRegion: options?.geographicRegion,
        projectionYear: options?.projectionYear,
        familyComposition: options?.familyComposition || {
          familySize: counts.principal + counts.spouse + counts.child + counts.specialNeeds,
          hasSpouse: counts.spouse > 0,
          childCount: counts.child,
          specialNeedsCount: counts.specialNeeds,
          singleParent: counts.spouse === 0 && counts.child > 0
        },
        demographics: options?.demographicData,
        historicalClaims: options?.historicalClaims,
        dataQuality: options?.dataQuality || 85
      };

      // Calculate enhanced premium
      enhancedCalculation = await calculateRiskAdjustedPremium(storage, enhancedInput);

      if (methodology === 'risk-adjusted') {
        // Use fully adjusted premium
        subtotal = enhancedCalculation.adjustedPremium;
      } else {
        // Hybrid approach: blend standard and risk-adjusted
        const standardTotal = (
          (counts.principal * rates.principalRate) +
          (counts.spouse * rates.spouseRate) +
          (counts.child * rates.childRate) +
          (counts.specialNeeds * rates.specialNeedsRate)
        );
        subtotal = (standardTotal * 0.7) + (enhancedCalculation.adjustedPremium * 0.3);
      }
    } else {
      // Use standard calculation
      subtotal = (
        (counts.principal * rates.principalRate) +
        (counts.spouse * rates.spouseRate) +
        (counts.child * rates.childRate) +
        (counts.specialNeeds * rates.specialNeedsRate)
      );
    }
  } catch (error) {
    // Fallback to standard calculation if enhanced calculation fails
    console.warn('Enhanced premium calculation failed, falling back to standard:', error);
    subtotal = (
      (counts.principal * rates.principalRate) +
      (counts.spouse * rates.spouseRate) +
      (counts.child * rates.childRate) +
      (counts.specialNeeds * rates.specialNeedsRate)
    );
  }

  const tax = subtotal * rates.taxRate;
  total = subtotal + tax;
  
  // Create premium data
  const premium: schema.InsertPremium = {
    companyId,
    periodId,
    principalCount: counts.principal,
    spouseCount: counts.spouse,
    childCount: counts.child,
    specialNeedsCount: counts.specialNeeds,
    subtotal,
    tax,
    total,
    issuedDate: new Date(),
    status: 'active',
    adjustmentFactor: enhancedCalculation ? (enhancedCalculation.adjustedPremium / enhancedCalculation.basePremium) : 1.0,
    effectiveStartDate: new Date(activePeriod.startDate),
    effectiveEndDate: new Date(activePeriod.endDate),
    notes: enhancedCalculation ?
      `Calculated using ${methodology} methodology. Confidence: ${enhancedCalculation.confidence}%.` :
      'Calculated using standard methodology.'
  };
  
  return premium;
}

/**
 * Calculate enhanced premium with risk adjustment (wrapper function)
 */
export async function calculateEnhancedPremium(
  storage: IStorage,
  companyId: number,
  input: PremiumCalculationInput
): Promise<PremiumResult> {
  return await calculateRiskAdjustedPremium(storage, input);
}

/**
 * Get pricing methodology used for a premium calculation
 */
export function getPricingMethodology(options?: PremiumCalculationOptions): {
  methodology: 'standard' | 'risk-adjusted' | 'hybrid';
  description: string;
  confidence: number;
} {
  const methodology = options?.methodology || 'standard';
  const includeRiskAdjustment = options?.includeRiskAdjustment || false;

  if (methodology === 'risk-adjusted' && includeRiskAdjustment) {
    return {
      methodology: 'risk-adjusted',
      description: 'Full risk-adjusted pricing using individual risk scores and demographic factors',
      confidence: options?.dataQuality || 85
    };
  } else if (methodology === 'hybrid' && includeRiskAdjustment) {
    return {
      methodology: 'hybrid',
      description: 'Blended approach combining standard and risk-adjusted pricing (70/30 split)',
      confidence: (options?.dataQuality || 85) * 0.8
    };
  } else {
    return {
      methodology: 'standard',
      description: 'Traditional premium calculation based on member types and fixed rates',
      confidence: 95
    };
  }
}

/**
 * Calculate premium for individual member with enhanced features
 */
export async function calculateIndividualPremium(
  storage: IStorage,
  memberId: number,
  options?: PremiumCalculationOptions
): Promise<PremiumResult> {
  // Get member information
  const member = await storage.getMember(memberId);
  if (!member) {
    throw new Error(`Member with ID ${memberId} not found`);
  }

  // Prepare individual calculation input
  const input: PremiumCalculationInput = {
    companyId: member.companyId,
    memberId,
    includeRiskAdjustment: options?.includeRiskAdjustment || true,
    geographicRegion: options?.geographicRegion,
    projectionYear: options?.projectionYear,
    dataQuality: options?.dataQuality || 85
  };

  return await calculateRiskAdjustedPremium(storage, input);
}

/**
 * Support mixed pricing models during transition period
 */
export async function calculateMixedModelPremium(
  storage: IStorage,
  companyId: number,
  periodId?: number,
  riskAdjustmentWeight: number = 0.5 // Default 50/50 split
): Promise<schema.InsertPremium> {
  // Calculate standard premium
  const standardPremium = await calculatePremium(storage, companyId, periodId, { methodology: 'standard' });

  // Calculate risk-adjusted premium
  const companyMembers = await storage.getMembersByCompany(companyId);
  const memberIds = companyMembers.map(member => member.id);

  const enhancedInput: PremiumCalculationInput = {
    companyId,
    periodId,
    memberIds,
    includeRiskAdjustment: true,
    dataQuality: 80
  };

  const enhancedResult = await calculateRiskAdjustedPremium(storage, enhancedInput);

  // Blend the results
  const blendedSubtotal = (standardPremium.subtotal * (1 - riskAdjustmentWeight)) +
                         (enhancedResult.basePremium * riskAdjustmentWeight);
  const blendedTax = blendedSubtotal * (standardPremium.tax / standardPremium.subtotal);
  const blendedTotal = blendedSubtotal + blendedTax;

  // Create blended premium record
  const blendedPremium: schema.InsertPremium = {
    ...standardPremium,
    subtotal: blendedSubtotal,
    tax: blendedTax,
    total: blendedTotal,
    adjustmentFactor: enhancedResult.adjustedPremium / enhancedResult.basePremium,
    notes: `Mixed model calculation with ${Math.round(riskAdjustmentWeight * 100)}% risk adjustment weighting.`
  };

  return blendedPremium;
}

/**
 * Recalculate premium when members are added or removed
 */
export async function recalculatePremiumOnMemberChange(
  storage: IStorage,
  companyId: number,
  isAddition: boolean,
  memberType: string,
  dependentType?: string,
  hasDisability?: boolean
): Promise<schema.InsertPremium | null> {
  // Get the active period
  const activePeriod = await getActivePeriod();
  if (!activePeriod) {
    throw new Error('No active period found');
  }
  
  // Get the latest premium for this company and period
  const latestPremium = await getLatestPremium(companyId, activePeriod.id);
  if (!latestPremium) {
    // If no premium exists, calculate a new one
    return await calculatePremium(storage, companyId, activePeriod.id);
  }
  
  // Get premium rates for the period
  const rates = await storage.getPremiumRateByPeriod(activePeriod.id);
  if (!rates) {
    throw new Error(`Premium rates not found for period ID ${activePeriod.id}`);
  }
  
  // Get member counts
  let { principalCount, spouseCount, childCount, specialNeedsCount } = latestPremium;
  
  // Update counts based on member type
  if (isAddition) {
    // Adding a member
    if (memberType === 'principal') {
      principalCount++;
    } else if (memberType === 'dependent') {
      if (dependentType === 'spouse') {
        spouseCount++;
      } else if (dependentType === 'child') {
        if (hasDisability) {
          specialNeedsCount++;
        } else {
          childCount++;
        }
      }
    }
  } else {
    // Removing a member
    if (memberType === 'principal') {
      principalCount--;
    } else if (memberType === 'dependent') {
      if (dependentType === 'spouse') {
        spouseCount--;
      } else if (dependentType === 'child') {
        if (hasDisability) {
          specialNeedsCount--;
        } else {
          childCount--;
        }
      }
    }
  }
  
  // Recalculate premium
  const subtotal = (
    (principalCount * rates.principalRate) +
    (spouseCount * rates.spouseRate) +
    (childCount * rates.childRate) +
    (specialNeedsCount * rates.specialNeedsRate)
  );
  
  const tax = subtotal * rates.taxRate;
  const total = subtotal + tax;
  
  // Calculate pro-rata amount if applicable
  const today = new Date();
  const endDate = new Date(activePeriod.endDate);
  const proRatedTotal = calculateProRataAmount(total, today, endDate);
  
  // Create adjustment premium
  const premium: schema.InsertPremium = {
    companyId,
    periodId: activePeriod.id,
    principalCount,
    spouseCount,
    childCount,
    specialNeedsCount,
    subtotal,
    tax,
    total,
    proRatedTotal,
    issuedDate: new Date(),
    status: 'active',
    previousPremiumId: latestPremium.id,
    isAdjustment: true,
    adjustmentFactor: proRatedTotal / total,
    effectiveStartDate: today,
    effectiveEndDate: endDate,
    proRataStartDate: today,
    proRataEndDate: endDate,
    proRataAmount: proRatedTotal - total,
    notes: isAddition ? 'Premium adjustment due to member addition' : 'Premium adjustment due to member removal'
  };
  
  return premium;
}

/**
 * Calculate pro-rata amount based on remaining days in the period
 */
export function calculateProRataAmount(
  originalAmount: number,
  startDate: Date,
  endDate: Date
): number {
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const periodDays = 365; // Assuming annual period, adjust as needed
  const proRataFactor = totalDays / periodDays;
  return originalAmount * proRataFactor;
}

/**
 * Calculate premium adjustment when a member is deleted
 */
export async function calculatePremiumAdjustmentForMemberDeletion(
  storage: IStorage,
  companyId: number,
  member: schema.Member
): Promise<schema.InsertPremium | null> {
  return recalculatePremiumOnMemberChange(
    storage,
    companyId,
    false, // isAddition = false for member deletion
    member.memberType,
    member.dependentType || undefined,
    member.hasDisability || undefined
  );
}