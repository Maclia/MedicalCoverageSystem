import { Injectable, Inject } from '@nestjs/common';
import { DrizzlePool } from '../database/types';
import * as schema from '../shared/schema';
import { eq, and, desc, sql, lt, gte, between } from 'drizzle-orm';
import {
  Claim,
  ClaimStatus,
  ClaimReserve,
  ClaimReserveStatus,
  ClaimReserveType,
  ClaimReserveTransaction,
  ClaimFinancialTransaction,
  FinancialTransactionType,
  FinancialTransactionStatus
} from '../shared/schema';

@Injectable()
export class ClaimReserveService {
  constructor(@Inject('DATABASE') private db: DrizzlePool) {}

  /**
   * Create initial reserve for a new claim
   */
  async createInitialReserve(claimId: string, estimatedAmount: number, notes?: string): Promise<ClaimReserve> {
    const claim = await this.db.select().from(schema.claims)
      .where(eq(schema.claims.id, claimId))
      .limit(1);

    if (!claim[0]) {
      throw new Error('Claim not found');
    }

    const reserve = await this.db.insert(schema.claimReserves)
      .values({
        claimId,
        reserveType: ClaimReserveType.INCURRED_LOSS,
        amount: estimatedAmount,
        currency: claim[0].currency,
        status: ClaimReserveStatus.ACTIVE,
        notes,
        reservedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const createdReserve = reserve[0];

    // Record transaction
    await this.db.insert(schema.claimReserveTransactions)
      .values({
        reserveId: createdReserve.id,
        transactionType: 'INITIAL',
        amount: estimatedAmount,
        previousAmount: 0,
        newAmount: estimatedAmount,
        reason: 'Initial reserve creation',
        createdAt: new Date()
      });

    return createdReserve;
  }

  /**
   * Adjust existing reserve
   */
  async adjustReserve(
    reserveId: string,
    newAmount: number,
    reason: string,
    adjusterId: string
  ): Promise<ClaimReserve> {
    const reserve = await this.db.select().from(schema.claimReserves)
      .where(eq(schema.claimReserves.id, reserveId))
      .limit(1);

    if (!reserve[0]) {
      throw new Error('Reserve not found');
    }

    const currentAmount = reserve[0].amount;
    const difference = newAmount - currentAmount;

    const updatedReserve = await this.db.update(schema.claimReserves)
      .set({
        amount: newAmount,
        status: newAmount === 0 ? ClaimReserveStatus.CLOSED : ClaimReserveStatus.ACTIVE,
        lastAdjustmentAt: new Date(),
        lastAdjustmentBy: adjusterId,
        updatedAt: new Date()
      })
      .where(eq(schema.claimReserves.id, reserveId))
      .returning();

    // Record adjustment transaction
    await this.db.insert(schema.claimReserveTransactions)
      .values({
        reserveId,
        transactionType: 'ADJUSTMENT',
        amount: difference,
        previousAmount: currentAmount,
        newAmount: newAmount,
        reason,
        createdBy: adjusterId,
        createdAt: new Date()
      });

    // Record financial transaction if significant adjustment
    if (Math.abs(difference) > 1000) {
      await this.db.insert(schema.claimFinancialTransactions)
        .values({
          claimId: reserve[0].claimId,
          transactionType: difference > 0 ?
            FinancialTransactionType.RESERVE_INCREASE :
            FinancialTransactionType.RESERVE_DECREASE,
          amount: Math.abs(difference),
          currency: reserve[0].currency,
          status: FinancialTransactionStatus.POSTED,
          description: `Reserve ${difference > 0 ? 'increase' : 'decrease'}: ${reason}`,
          referenceId: reserveId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    return updatedReserve[0];
  }

  /**
   * Create additional reserve (e.g., for legal expenses)
   */
  async createAdditionalReserve(
    claimId: string,
    type: ClaimReserveType,
    amount: number,
    reason: string,
    creatorId: string
  ): Promise<ClaimReserve> {
    const claim = await this.db.select().from(schema.claims)
      .where(eq(schema.claims.id, claimId))
      .limit(1);

    if (!claim[0]) {
      throw new Error('Claim not found');
    }

    const reserve = await this.db.insert(schema.claimReserves)
      .values({
        claimId,
        reserveType: type,
        amount,
        currency: claim[0].currency,
        status: ClaimReserveStatus.ACTIVE,
        notes: reason,
        reservedAt: new Date(),
        createdBy: creatorId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const createdReserve = reserve[0];

    // Record transaction
    await this.db.insert(schema.claimReserveTransactions)
      .values({
        reserveId: createdReserve.id,
        transactionType: 'ADDITIONAL',
        amount,
        previousAmount: 0,
        newAmount: amount,
        reason,
        createdBy: creatorId,
        createdAt: new Date()
      });

    return createdReserve;
  }

  /**
   * Release or recover reserve
   */
  async releaseReserve(
    reserveId: string,
    releaseAmount: number,
    reason: string,
    adjusterId: string
  ): Promise<ClaimReserve> {
    const reserve = await this.db.select().from(schema.claimReserves)
      .where(eq(schema.claimReserves.id, reserveId))
      .limit(1);

    if (!reserve[0]) {
      throw new Error('Reserve not found');
    }

    if (releaseAmount > reserve[0].amount) {
      throw new Error('Release amount cannot exceed current reserve amount');
    }

    const newAmount = reserve[0].amount - releaseAmount;

    const updatedReserve = await this.db.update(schema.claimReserves)
      .set({
        amount: newAmount,
        status: newAmount === 0 ? ClaimReserveStatus.CLOSED : ClaimReserveStatus.ACTIVE,
        lastAdjustmentAt: new Date(),
        lastAdjustmentBy: adjusterId,
        updatedAt: new Date()
      })
      .where(eq(schema.claimReserves.id, reserveId))
      .returning();

    // Record release transaction
    await this.db.insert(schema.claimReserveTransactions)
      .values({
        reserveId,
        transactionType: 'RELEASE',
        amount: -releaseAmount,
        previousAmount: reserve[0].amount,
        newAmount: newAmount,
        reason,
        createdBy: adjusterId,
        createdAt: new Date()
      });

    return updatedReserve[0];
  }

  /**
   * Get all reserves for a claim
   */
  async getClaimReserves(claimId: string): Promise<ClaimReserve[]> {
    return await this.db.select()
      .from(schema.claimReserves)
      .where(eq(schema.claimReserves.claimId, claimId))
      .orderBy(schema.claimReserves.reservedAt);
  }

  /**
   * Get reserve with transaction history
   */
  async getReserveWithHistory(reserveId: string): Promise<{
    reserve: ClaimReserve;
    transactions: ClaimReserveTransaction[];
  }> {
    const reserve = await this.db.select()
      .from(schema.claimReserves)
      .where(eq(schema.claimReserves.id, reserveId))
      .limit(1);

    if (!reserve[0]) {
      throw new Error('Reserve not found');
    }

    const transactions = await this.db.select()
      .from(schema.claimReserveTransactions)
      .where(eq(schema.claimReserveTransactions.reserveId, reserveId))
      .orderBy(schema.claimReserveTransactions.createdAt);

    return {
      reserve: reserve[0],
      transactions
    };
  }

  /**
   * Calculate total reserves for a claim
   */
  async calculateTotalReserves(claimId: string): Promise<{
    totalIncurredLoss: number;
    totalExpense: number;
    totalRecovery: number;
    netReserve: number;
  }> {
    const reserves = await this.db.select()
      .from(schema.claimReserves)
      .where(eq(schema.claimReserves.claimId, claimId));

    const totals = reserves.reduce((acc, reserve) => {
      switch (reserve.reserveType) {
        case ClaimReserveType.INCURRED_LOSS:
          acc.totalIncurredLoss += reserve.amount;
          break;
        case ClaimReserveType.EXPENSE:
          acc.totalExpense += reserve.amount;
          break;
        case ClaimReserveType.SALVAGE_RECOVERY:
          acc.totalRecovery += reserve.amount;
          break;
      }
      return acc;
    }, {
      totalIncurredLoss: 0,
      totalExpense: 0,
      totalRecovery: 0
    });

    const netReserve = totals.totalIncurredLoss + totals.totalExpense - totals.totalRecovery;

    return { ...totals, netReserve };
  }

  /**
   * Analyze reserve adequacy
   */
  async analyzeReserveAdequacy(claimId: string): Promise<{
    currentReserves: any;
    projectedPayments: number;
    adequacyRatio: number;
    recommendation: 'ADEQUATE' | 'INCREASE' | 'DECREASE';
    reasons: string[];
  }> {
    const [reserves, payments] = await Promise.all([
      this.calculateTotalReserves(claimId),
      this.db.select({
        amount: schema.claimPayments.amount
      }).from(schema.claimPayments)
        .where(eq(schema.claimPayments.claimId, claimId))
    ]);

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const projectedPayments = totalPaid * 1.2; // Simple projection
    const adequacyRatio = reserves.netReserve / projectedPayments;

    let recommendation: 'ADEQUATE' | 'INCREASE' | 'DECREASE';
    let reasons: string[] = [];

    if (adequacyRatio >= 1.1) {
      recommendation = 'DECREASE';
      reasons.push('Reserve significantly exceeds projected payments');
    } else if (adequacyRatio < 0.9) {
      recommendation = 'INCREASE';
      reasons.push('Reserve may be insufficient for projected payments');
    } else {
      recommendation = 'ADEQUATE';
      reasons.push('Reserve appears adequate for projected payments');
    }

    return {
      currentReserves: reserves,
      projectedPayments,
      adequacyRatio,
      recommendation,
      reasons
    };
  }

  /**
   * Generate reserve adequacy report
   */
  async generateReserveAdequacyReport(criteria: {
    adjusterId?: string;
    minAmount?: number;
    status?: ClaimReserveStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any[]> {
    let whereConditions: any[] = [];

    if (criteria.adjusterId) {
      whereConditions.push(eq(schema.claimReserves.createdBy, criteria.adjusterId));
    }

    if (criteria.minAmount) {
      whereConditions.push(gte(schema.claimReserves.amount, criteria.minAmount));
    }

    if (criteria.status) {
      whereConditions.push(eq(schema.claimReserves.status, criteria.status));
    }

    if (criteria.dateFrom && criteria.dateTo) {
      whereConditions.push(
        between(schema.claimReserves.reservedAt, criteria.dateFrom, criteria.dateTo)
      );
    }

    const reserves = await this.db.select({
      id: schema.claimReserves.id,
      claimId: schema.claimReserves.claimId,
      reserveType: schema.claimReserves.reserveType,
      amount: schema.claimReserves.amount,
      status: schema.claimReserves.status,
      reservedAt: schema.claimReserves.reservedAt,
      lastAdjustmentAt: schema.claimReserves.lastAdjustmentAt,
      claimNumber: schema.claims.claimNumber,
      policyNumber: schema.policies.policyNumber,
      clientName: schema.clients.name
    })
      .from(schema.claimReserves)
      .leftJoin(schema.claims, eq(schema.claims.id, schema.claimReserves.claimId))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.policies.clientId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .orderBy(schema.claimReserves.reservedAt);

    return reserves;
  }

  /**
   * Auto-adjust reserves based on payment patterns
   */
  async autoAdjustReserves(): Promise<{
    processed: number;
    adjustments: any[];
  }> {
    // Get active claims with significant recent payments
    const recentPayments = await this.db.select({
      claimId: schema.claimPayments.claimId,
      totalPaid: sql<number>`SUM(${schema.claimPayments.amount})`.as('totalPaid'),
      paymentCount: sql<number>`COUNT(*)`.as('paymentCount')
    })
      .from(schema.claimPayments)
      .where(
        and(
          gte(schema.claimPayments.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          eq(schema.claimPayments.status, 'COMPLETED')
        )
      )
      .groupBy(schema.claimPayments.claimId)
      .having(sql`COUNT(*) > 2`);

    const adjustments = [];

    for (const payment of recentPayments) {
      const adequacy = await this.analyzeReserveAdequacy(payment.claimId);

      if (adequacy.recommendation !== 'ADEQUATE' && adequacy.adequacyRatio < 0.7 || adequacy.adequacyRatio > 1.3) {
        // Find primary reserve to adjust
        const reserves = await this.db.select()
          .from(schema.claimReserves)
          .where(
            and(
              eq(schema.claimReserves.claimId, payment.claimId),
              eq(schema.claimReserves.reserveType, ClaimReserveType.INCURRED_LOSS),
              eq(schema.claimReserves.status, ClaimReserveStatus.ACTIVE)
            )
          )
          .limit(1);

        if (reserves[0]) {
          const currentAmount = reserves[0].amount;
          const recommendedAmount = adequacy.projectedPayments;

          await this.adjustReserve(
            reserves[0].id,
            recommendedAmount,
            `Auto-adjustment based on recent payment patterns: ${adequacy.reasons.join(', ')}`,
            'SYSTEM'
          );

          adjustments.push({
            claimId: payment.claimId,
            reserveId: reserves[0].id,
            previousAmount: currentAmount,
            newAmount: recommendedAmount,
            reason: adequacy.reasons.join(', ')
          });
        }
      }
    }

    return {
      processed: recentPayments.length,
      adjustments
    };
  }

  /**
   * Close all reserves for a claim
   */
  async closeClaimReserves(claimId: string, reason: string, adjusterId: string): Promise<number> {
    const reserves = await this.db.select()
      .from(schema.claimReserves)
      .where(
        and(
          eq(schema.claimReserves.claimId, claimId),
          eq(schema.claimReserves.status, ClaimReserveStatus.ACTIVE)
        )
      );

    let closedCount = 0;

    for (const reserve of reserves) {
      await this.db.update(schema.claimReserves)
        .set({
          status: ClaimReserveStatus.CLOSED,
          amount: 0,
          lastAdjustmentAt: new Date(),
          lastAdjustmentBy: adjusterId,
          updatedAt: new Date()
        })
        .where(eq(schema.claimReserves.id, reserve.id));

      // Record closing transaction
      await this.db.insert(schema.claimReserveTransactions)
        .values({
          reserveId: reserve.id,
          transactionType: 'CLOSE',
          amount: -reserve.amount,
          previousAmount: reserve.amount,
          newAmount: 0,
          reason,
          createdBy: adjusterId,
          createdAt: new Date()
        });

      closedCount++;
    }

    return closedCount;
  }

  /**
   * Get reserve trends over time
   */
  async getReserveTrends(period: 'month' | 'quarter' | 'year', months: number = 12): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const dateFormat = period === 'month' ? 'YYYY-MM' : period === 'quarter' ? 'YYYY-"Q"Q' : 'YYYY';

    const trends = await this.db.select({
      period: sql<string>`TO_CHAR(${schema.claimReserves.reservedAt}, '${dateFormat}')`.as('period'),
      newReserves: sql<number>`SUM(CASE WHEN ${schema.claimReserveTransactions.transactionType} = 'INITIAL' THEN ${schema.claimReserveTransactions.amount} ELSE 0 END)`.as('newReserves'),
      increases: sql<number>`SUM(CASE WHEN ${schema.claimReserveTransactions.transactionType} = 'ADJUSTMENT' AND ${schema.claimReserveTransactions.amount} > 0 THEN ${schema.claimReserveTransactions.amount} ELSE 0 END)`.as('increases'),
      decreases: sql<number>`SUM(CASE WHEN ${schema.claimReserveTransactions.transactionType} = 'ADJUSTMENT' AND ${schema.claimReserveTransactions.amount} < 0 THEN ABS(${schema.claimReserveTransactions.amount}) ELSE 0 END)`.as('decreases'),
      releases: sql<number>`SUM(ABS(CASE WHEN ${schema.claimReserveTransactions.transactionType} = 'RELEASE' THEN ${schema.claimReserveTransactions.amount} ELSE 0 END))`.as('releases')
    })
      .from(schema.claimReserveTransactions)
      .leftJoin(schema.claimReserves, eq(schema.claimReserves.id, schema.claimReserveTransactions.reserveId))
      .where(gte(schema.claimReserveTransactions.createdAt, startDate))
      .groupBy(sql`TO_CHAR(${schema.claimReserveTransactions.createdAt}, '${dateFormat}')`)
      .orderBy(sql`period`);

    return trends;
  }
}