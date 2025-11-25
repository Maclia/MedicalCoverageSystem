/**
 * Database utility operations for the application
 */
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../../shared/schema.js';

/**
 * Get the latest premium for a company and period
 */
export async function getLatestPremium(companyId: number, periodId: number) {
  if (!db) return null;
  
  // Get all premiums for the company and period, ordered by creation date desc
  const premiums = await db.select()
    .from(schema.premiums)
    .where(
      and(
        eq(schema.premiums.companyId, companyId),
        eq(schema.premiums.periodId, periodId)
      )
    )
    .orderBy(desc(schema.premiums.createdAt))
    .limit(1);
  
  return premiums.length > 0 ? premiums[0] : null;
}

/**
 * Check if a member has any claims
 */
export async function memberHasClaims(memberId: number) {
  if (!db) return false;
  
  const claims = await db.select()
    .from(schema.claims)
    .where(eq(schema.claims.memberId, memberId));
  
  return claims.length > 0;
}

/**
 * Get active period
 */
export async function getActivePeriod() {
  if (!db) return null;
  
  const activePeriods = await db.select()
    .from(schema.periods)
    .where(eq(schema.periods.status, 'active'));
  
  return activePeriods.length > 0 ? activePeriods[0] : null;
}

/**
 * Get premium rates for a period
 */
export async function getPremiumRatesForPeriod(periodId: number) {
  if (!db) return null;
  
  const rates = await db.select()
    .from(schema.premiumRates)
    .where(eq(schema.premiumRates.periodId, periodId));
  
  return rates.length > 0 ? rates[0] : null;
}

/**
 * Count members by type for a company
 */
export async function countMembersByType(companyId: number) {
  if (!db) return { principal: 0, spouse: 0, child: 0, specialNeeds: 0 };
  
  const members = await db.select()
    .from(schema.members)
    .where(eq(schema.members.companyId, companyId));
  
  const counts = {
    principal: 0,
    spouse: 0,
    child: 0,
    specialNeeds: 0
  };
  
  members.forEach(member => {
    if (member.memberType === 'principal') {
      counts.principal++;
    } else if (member.memberType === 'dependent') {
      if (member.dependentType === 'spouse') {
        counts.spouse++;
      } else if (member.dependentType === 'child') {
        if (member.hasDisability) {
          counts.specialNeeds++;
        } else {
          counts.child++;
        }
      }
    }
  });
  
  return counts;
}

/**
 * Create a new premium
 */
export async function createPremium(data: schema.InsertPremium) {
  if (!db) throw new Error('Database not available');
  
  const [premium] = await db.insert(schema.premiums)
    .values(data)
    .returning();
  
  return premium;
}

/**
 * Update a premium status
 */
export async function updatePremiumStatus(id: number, status: string) {
  if (!db) throw new Error('Database not available');
  
  const [updatedPremium] = await db.update(schema.premiums)
    .set({ status })
    .where(eq(schema.premiums.id, id))
    .returning();
  
  return updatedPremium;
}

/**
 * Get member details including company information
 */
export async function getMemberWithDetails(memberId: number) {
  if (!db) return null;
  
  const member = await db.select()
    .from(schema.members)
    .where(eq(schema.members.id, memberId))
    .limit(1);
  
  if (member.length === 0) return null;
  
  const memberData = member[0];
  
  // Get company information
  const companies = await db.select()
    .from(schema.companies)
    .where(eq(schema.companies.id, memberData.companyId));
  
  const company = companies.length > 0 ? companies[0] : null;
  
  // Get principal member info if this is a dependent
  let principalMember = null;
  if (memberData.memberType === 'dependent' && memberData.principalId) {
    const principals = await db.select()
      .from(schema.members)
      .where(eq(schema.members.id, memberData.principalId));
    
    principalMember = principals.length > 0 ? principals[0] : null;
  }
  
  // Return comprehensive member details
  return {
    ...memberData,
    company,
    principalMember
  };
}