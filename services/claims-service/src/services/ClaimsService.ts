import { drizzle } from '../config/database';
import { claims } from '../models/schema';
import { createLogger } from '../utils/logger';
import { eq } from 'drizzle-orm';

const logger = createLogger('claims-service');

export class ClaimsService {
  // Create a new claim
  static async createClaim(claimData: any): Promise<any> {
    try {
      const result = await drizzle.insert(claims).values(claimData).returning();
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

      const query = drizzle
        .select()
        .from(claims)
        .where(filters)
        .orderBy(claims.createdAt, 'desc')
        .limit(limit)
        .offset(offset);

      const [claimsData, totalCount] = await Promise.all([
        query,
        drizzle.count().from(claims).where(filters)
      ]);

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
      const claim = await drizzle
        .select()
        .from(claims)
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
      const result = await drizzle
        .update(claims)
        .set({
          status,
          reviewDate: new Date(),
          reviewerNotes: notes
        })
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
      const result = await drizzle
        .delete(claims)
        .where(eq(claims.id, claimId));

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting claim:', error);
      throw error;
    }
  }
}
