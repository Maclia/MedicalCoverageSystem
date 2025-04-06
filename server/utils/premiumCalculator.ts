/**
 * Premium calculator utility functions
 */
import { IStorage } from '../storage';
import * as schema from '@shared/schema';
import { getActivePeriod, countMembersByType, getLatestPremium } from './dbOperations';

/**
 * Calculate premium for a company based on members and premium rates
 */
export async function calculatePremium(
  storage: IStorage,
  companyId: number,
  periodId?: number
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
  
  // Calculate premium
  const subtotal = (
    (counts.principal * rates.principalRate) +
    (counts.spouse * rates.spouseRate) +
    (counts.child * rates.childRate) +
    (counts.specialNeeds * rates.specialNeedsRate)
  );
  
  const tax = subtotal * rates.taxRate;
  const total = subtotal + tax;
  
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
    adjustmentFactor: 1.0,
    effectiveStartDate: new Date(activePeriod.startDate),
    effectiveEndDate: new Date(activePeriod.endDate)
  };
  
  return premium;
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