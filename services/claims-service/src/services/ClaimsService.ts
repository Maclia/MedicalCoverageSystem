import { db as drizzle } from '../config/database.js';
import { claims } from '../models/schema.js';
import { createLogger } from '../utils/logger.js';
import { eq, sql } from 'drizzle-orm';
// @ts-ignore: Drizzle ORM count function import
const count = sql`count(*)`;
// @ts-ignore: Drizzle ORM version compatibility issues with shared schema types

const logger = createLogger('claims-service');

export class ClaimsService {
  // Create a new claim
  static async createClaim(claimData: any): Promise<any> {
    try {
// @ts-ignore: Drizzle ORM table type compatibility issue
const result = await drizzle.insert(claims as any).values(claimData).returning();
      return result[0];
    } catch (error) {
      logger.error('Error creating claim:', error);
      throw error;
    }
  }

  // Get all claims with pagination and filtering
  static async getClaims(page: number, limit: number, filters: any): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      // @ts-ignore: Drizzle ORM table type compatibility issue
      const query = drizzle
        .select()
        .from(claims as any)
        .where(filters)
        .orderBy(sql`${claims.createdAt} desc`)
        .limit(limit)
        .offset(offset);

      const [claimsData, totalResult] = await Promise.all([
        query,
        // @ts-ignore: Drizzle ORM table type compatibility issue
        drizzle.select({ count: count() }).from(claims as any).where(filters)
      ]);
      const totalCount = totalResult[0]?.count || 0;

      return {
        claims: claimsData,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting claims:', error);
      throw error;
    }
  }

  // Get claim by ID
  static async getClaimById(claimId: number): Promise<any> {
    try {
      // @ts-ignore: Drizzle ORM table type compatibility issue
      const claim = await drizzle
        .select()
        .from(claims as any)
        // @ts-ignore: Drizzle ORM column type compatibility issue
        .where(eq(claims.id, claimId))
        .limit(1);

      return claim[0] || null;
    } catch (error) {
      logger.error('Error getting claim:', error);
      throw error;
    }
  }

  // Update claim status
  static async updateClaimStatus(claimId: number, status: string, notes?: string): Promise<any> {
    try {
      // @ts-ignore: Drizzle ORM table type compatibility issue
      const result = await drizzle
        .update(claims as any)
        .set({
          status,
          reviewDate: new Date(),
          reviewerNotes: notes
        })
        // @ts-ignore: Drizzle ORM column type compatibility issue
        .where(eq(claims.id, claimId))
        .returning();

      return result[0] || null;
    } catch (error) {
      logger.error('Error updating claim status:', error);
      throw error;
    }
  }

  // Delete claim
  static async deleteClaim(claimId: number): Promise<boolean> {
    try {
      // @ts-ignore: Drizzle ORM table type compatibility issue
      const result = await drizzle
        .delete(claims as any)
        // @ts-ignore: Drizzle ORM column type compatibility issue
        .where(eq(claims.id, claimId));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting claim:', error);
      throw error;
    }
  }

  /**
   * Check member benefit balance availability
   * Verifies if member has remaining benefit balance for the requested amount
   */
  static async checkBenefitBalance(memberId: number, benefitId: number, requestedAmount: number): Promise<{
    available: boolean;
    remainingBalance: number;
    limitAmount: number;
    utilizedAmount: number;
  }> {
    try {
      // Get current benefit utilization for this member and benefit
      const currentYear = new Date().getFullYear();
      const period = `${currentYear}-01`;

      // Check benefit utilization table
      const query = sql`
        SELECT 
          utilized_amount as "utilizedAmount", 
          limit_amount as "limitAmount", 
          remaining_amount as "remainingAmount"
        FROM benefit_utilization
        WHERE member_id = ${memberId}
        AND benefit_id = ${benefitId}
        AND period = ${period}
        LIMIT 1
      `;

      const utilization = await drizzle.execute(query) as any;
      
      if (utilization.length === 0) {
        // No utilization record found - assume full limit available
        return {
          available: true,
          remainingBalance: 999999.99,
          limitAmount: 999999.99,
          utilizedAmount: 0
        };
      }

      const { remainingAmount, limitAmount, utilizedAmount } = utilization[0];
      const available = requestedAmount <= remainingAmount;

      return {
        available,
        remainingBalance: remainingAmount,
        limitAmount,
        utilizedAmount
      };
    } catch (error) {
      logger.error('Error checking benefit balance:', error);
      // Fail open if balance check fails (administrator will review)
      return {
        available: true,
        remainingBalance: 0,
        limitAmount: 0,
        utilizedAmount: 0
      };
    }
  }

  /**
   * Verify member eligibility before claim processing
   * Checks member status, active coverage and validity dates
   */
  static async verifyMemberEligibility(memberId: number, serviceDate: Date): Promise<{
    eligible: boolean;
    error?: string;
    memberDetails?: any;
  }> {
    try {
      // Query member status
      const query = sql`
        SELECT 
          id,
          membership_status as "membershipStatus",
          enrollment_date as "enrollmentDate",
          termination_date as "terminationDate",
          first_name as "firstName",
          last_name as "lastName"
        FROM members
        WHERE id = ${memberId}
        LIMIT 1
      `;

      const result = await drizzle.execute(query) as any;
      
      if (result.length === 0) {
        return {
          eligible: false,
          error: 'Member not found. Please verify member ID.'
        };
      }

      const member = result[0];

      // Check membership status
      if (member.membershipStatus !== 'active') {
        return {
          eligible: false,
          error: `Member is not active. Current status: ${member.membershipStatus}`
        };
      }

      // Check service date is after enrollment date
      if (member.enrollmentDate && serviceDate < new Date(member.enrollmentDate)) {
        return {
          eligible: false,
          error: 'Service date is before member enrollment date. Coverage not active.'
        };
      }

      // Check service date is before termination date (if set)
      if (member.terminationDate && serviceDate > new Date(member.terminationDate)) {
        return {
          eligible: false,
          error: 'Service date is after member termination date. Coverage expired.'
        };
      }

      return {
        eligible: true,
        memberDetails: member
      };
    } catch (error) {
      logger.error('Error verifying member eligibility:', error);
      return {
        eligible: false,
        error: 'Failed to verify member eligibility. Please try again later.'
      };
    }
  }

  /**
   * Verify provider authorization and license status before claim processing
   * Critical fraud prevention check to prevent fraudulent claims
   */
  static async verifyProviderAuthorization(providerId: number, benefitId: number): Promise<{
    authorized: boolean;
    error?: string;
    providerDetails?: any;
  }> {
    try {
      // Query provider status and license information
      const query = sql`
        SELECT 
          id,
          provider_name as "providerName",
          status,
          license_number as "licenseNumber",
          license_expiry as "licenseExpiry",
          is_blacklisted as "isBlacklisted",
          verification_status as "verificationStatus"
        FROM providers
        WHERE id = ${providerId}
        LIMIT 1
      `;

      const result = await drizzle.execute(query) as any;
      
      if (result.length === 0) {
        return {
          authorized: false,
          error: 'Provider not registered in the system. Please verify provider ID.'
        };
      }

      const provider = result[0];

      // Check if provider is blacklisted
      if (provider.isBlacklisted) {
        logger.warn(`⚠️ FRAUD ALERT: Claim submitted from BLACKLISTED provider ID: ${providerId}`);
        return {
          authorized: false,
          error: 'This provider has been blacklisted. Claims cannot be processed for this provider.'
        };
      }

      // Check provider verification status
      if (provider.verificationStatus !== 'verified') {
        return {
          authorized: false,
          error: `Provider is not fully verified. Current verification status: ${provider.verificationStatus}`
        };
      }

      // Check provider is active
      if (provider.status !== 'active') {
        return {
          authorized: false,
          error: `Provider is not active. Current status: ${provider.status}`
        };
      }

      // Check license validity
      if (provider.licenseExpiry && new Date() > new Date(provider.licenseExpiry)) {
        return {
          authorized: false,
          error: 'Provider license has expired. Claims cannot be processed.'
        };
      }

      // Check provider is authorized for this specific benefit type
      const benefitQuery = sql`
        SELECT 1
        FROM provider_benefit_authorizations
        WHERE provider_id = ${providerId}
        AND benefit_id = ${benefitId}
        AND is_active = true
        LIMIT 1
      `;

      const benefitAuth = await drizzle.execute(benefitQuery) as any;
      
      if (benefitAuth.length === 0) {
        return {
          authorized: false,
          error: 'This provider is not authorized to provide this specific service type.'
        };
      }

      return {
        authorized: true,
        providerDetails: provider
      };
    } catch (error) {
      logger.error('Error verifying provider authorization:', error);
      return {
        authorized: false,
        error: 'Failed to verify provider authorization. Please try again later.'
      };
    }
  }

  /**
   * Duplicate Claim Detection - Prevents #1 most common fraud pattern
   * Checks if identical claim already exists within 72 hours
   */
  static async detectDuplicateClaim(claimData: any): Promise<{
    isDuplicate: boolean;
    existingClaimId?: number;
    error?: string;
  }> {
    try {
      // Look for identical claim already submitted in last 72 hours
      const query = sql`
        SELECT id
        FROM claims
        WHERE member_id = ${claimData.memberId}
        AND provider_id = ${claimData.providerId}
        AND benefit_id = ${claimData.benefitId}
        AND amount = ${claimData.amount}
        AND service_date = ${claimData.serviceDate}
        AND created_at >= NOW() - INTERVAL '72 hours'
        AND status NOT IN ('REJECTED', 'CANCELLED')
        LIMIT 1
      `;

      const result = await drizzle.execute(query) as any;
      
      if (result.length > 0) {
        const existingClaim = result[0];
        logger.warn(`⚠️ DUPLICATE CLAIM DETECTED: Existing claim ID ${existingClaim.id}`);
        
        return {
          isDuplicate: true,
          existingClaimId: existingClaim.id,
          error: `Duplicate claim detected. An identical claim was already submitted as Claim #${existingClaim.id}`
        };
      }

      return {
        isDuplicate: false
      };
    } catch (error) {
      logger.error('Error detecting duplicate claims:', error);
      // Fail open if duplicate check fails
      return {
        isDuplicate: false
      };
    }
  }
}
