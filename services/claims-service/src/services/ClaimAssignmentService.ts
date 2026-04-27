import { db as drizzle } from '../config/database.js';
import { claims } from '../models/schema.js';
import { createLogger } from '../utils/logger.js';
import { sql } from 'drizzle-orm';

const logger = createLogger('claim-assignment-service');

/**
 * Claim Assignment Service
 * Round Robin automatic claim distribution system
 * Distributes claims evenly across available claim reviewers
 */
export class ClaimAssignmentService {
  /**
   * Round Robin Claim Assignment System
   * Automatically assigns incoming claims to available claim reviewers
   * Distributes workload evenly across all active reviewers
   */
  static async assignClaimToReviewer(claimId: number): Promise<{
    assigned: boolean;
    reviewerId?: number;
    reviewerName?: string;
    error?: string;
  }> {
    try {
      // Start transaction to ensure atomic assignment
      return await drizzle.transaction(async (tx: any) => {
        // 1. Get list of active claim reviewers sorted by last assignment time
        const reviewersQuery = sql`
          SELECT id, first_name, last_name, last_claim_assigned_at
          FROM users 
          WHERE role = 'claim_reviewer'
          AND is_active = true
          ORDER BY last_claim_assigned_at ASC NULLS FIRST
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const reviewers = await tx.execute(reviewersQuery) as any;

        if (reviewers.length === 0) {
          logger.warn('No active claim reviewers available for assignment');
          return {
            assigned: false,
            error: 'No active claim reviewers available at this time'
          };
        }

        const selectedReviewer = reviewers[0];

        // 2. Assign the claim to this reviewer
        await tx.update(claims as any)
          .set({
            assigned_to: selectedReviewer.id,
            assigned_at: new Date(),
            status: 'ASSIGNED'
          })
          .where(sql`id = ${claimId}`);

        // 3. Update reviewer's last assignment timestamp
        await tx.execute(sql`
          UPDATE users 
          SET last_claim_assigned_at = NOW()
          WHERE id = ${selectedReviewer.id}
        `);

        logger.info(`Claim #${claimId} assigned to reviewer ${selectedReviewer.first_name} ${selectedReviewer.last_name} (ID: ${selectedReviewer.id})`);

        return {
          assigned: true,
          reviewerId: selectedReviewer.id,
          reviewerName: `${selectedReviewer.first_name} ${selectedReviewer.last_name}`
        };
      });
    } catch (error) {
      logger.error('Error assigning claim to reviewer:', error);
      return {
        assigned: false,
        error: 'Failed to assign claim to reviewer. Please try again later.'
      };
    }
  }

  /**
   * Auto-assign all pending unassigned claims
   * Background job function to process claim queue
   */
  static async autoAssignPendingClaims(): Promise<{
    totalAssigned: number;
    errors: number;
  }> {
    try {
      // Get all pending claims that are not yet assigned
      const pendingClaimsQuery = sql`
        SELECT id 
        FROM claims 
        WHERE status = 'PENDING'
        AND assigned_to IS NULL
        ORDER BY created_at ASC
      `;

      const pendingClaims = await drizzle.execute(pendingClaimsQuery) as any;
      
      let assignedCount = 0;
      let errorCount = 0;

      for (const claim of pendingClaims) {
        const result = await this.assignClaimToReviewer(claim.id);
        if (result.assigned) {
          assignedCount++;
        } else {
          errorCount++;
        }
      }

      logger.info(`Auto-assignment complete: ${assignedCount} claims assigned, ${errorCount} errors`);

      return {
        totalAssigned: assignedCount,
        errors: errorCount
      };
    } catch (error) {
      logger.error('Error during batch claim assignment:', error);
      return {
        totalAssigned: 0,
        errors: 1
      };
    }
  }

  /**
   * Get claims assigned to a specific reviewer
   */
  static async getReviewerClaims(reviewerId: number, status?: string): Promise<any[]> {
    try {
      let whereClause = sql`assigned_to = ${reviewerId}`;
      
      if (status) {
        whereClause = sql`${whereClause} AND status = ${status}`;
      }

      return await drizzle
        .select()
        .from(claims as any)
        .where(whereClause)
        .orderBy(sql`created_at desc`);
    } catch (error) {
      logger.error('Error getting reviewer claims:', error);
      throw error;
    }
  }
}