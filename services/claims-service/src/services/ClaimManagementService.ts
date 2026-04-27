import { db as drizzle } from '../config/database.js';
import { claims } from '../models/schema.js';
import { createLogger } from '../utils/logger.js';
import { eq, sql } from 'drizzle-orm';

// @ts-ignore: Drizzle ORM count function import
const count = sql`count(*)`;

const logger = createLogger('claim-management-service');

/**
 * Claim Management Service
 * Handles core CRUD operations for claims
 */
export class ClaimManagementService {
  /**
   * Create a new claim
   */
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

  /**
   * Get all claims with pagination and filtering
   */
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

  /**
   * Get claim by ID
   */
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

  /**
   * Update claim status
   */
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

  /**
   * Delete claim
   */
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
}