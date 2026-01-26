import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../db";
import {
  organizationTokenWallets,
  tokenBalanceHistory,
  tokenUsageForecasts,
  companies,
} from "../../shared/schema";

export class TokenWalletService {
  /**
   * Retrieves organization's token wallet, creates one if doesn't exist
   */
  async getWallet(organizationId: number) {
    let wallet = await db.query.organizationTokenWallets.findFirst({
      where: eq(organizationTokenWallets.organizationId, organizationId),
    });

    // If wallet doesn't exist, create one with default values
    if (!wallet) {
      const organization = await db.query.companies.findFirst({
        where: eq(companies.id, organizationId),
      });

      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      const [newWallet] = await db
        .insert(organizationTokenWallets)
        .values({
          organizationId,
          currentBalance: "0",
          totalPurchased: "0",
          totalConsumed: "0",
          pricePerToken: "0.50", // Default price per token
          currency: "USD",
          isActive: true,
        })
        .returning();

      wallet = newWallet;
    }

    return wallet;
  }

  /**
   * Updates wallet balance and creates history entry
   * Amount can be positive (add tokens) or negative (deduct tokens)
   */
  async updateBalance(
    organizationId: number,
    amount: string,
    changeType: string,
    referenceType?: string,
    referenceId?: number,
    performedBy?: number,
    description?: string
  ) {
    const wallet = await this.getWallet(organizationId);

    const balanceBefore = parseFloat(wallet.currentBalance);
    const changeAmount = parseFloat(amount);
    const balanceAfter = balanceBefore + changeAmount;

    if (balanceAfter < 0) {
      throw new Error(
        `Insufficient balance. Current: ${balanceBefore}, Requested: ${Math.abs(changeAmount)}`
      );
    }

    // Update wallet balance
    const [updatedWallet] = await db
      .update(organizationTokenWallets)
      .set({
        currentBalance: balanceAfter.toFixed(2),
        totalPurchased:
          changeAmount > 0
            ? (parseFloat(wallet.totalPurchased) + changeAmount).toFixed(2)
            : wallet.totalPurchased,
        totalConsumed:
          changeAmount < 0
            ? (parseFloat(wallet.totalConsumed) + Math.abs(changeAmount)).toFixed(2)
            : wallet.totalConsumed,
        updatedAt: new Date(),
      })
      .where(eq(organizationTokenWallets.id, wallet.id))
      .returning();

    // Create history entry
    await db.insert(tokenBalanceHistory).values({
      organizationId,
      changeAmount: amount,
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      changeType,
      referenceType,
      referenceId,
      description,
      performedBy,
      timestamp: new Date(),
    });

    return updatedWallet;
  }

  /**
   * Returns just the current balance (quick query)
   */
  async getBalance(organizationId: number): Promise<number> {
    const wallet = await this.getWallet(organizationId);
    return parseFloat(wallet.currentBalance);
  }

  /**
   * Checks if wallet is suspended due to payment failures
   */
  async checkSuspensionStatus(organizationId: number) {
    const wallet = await this.getWallet(organizationId);

    return {
      isSuspended: !wallet.isActive || wallet.suspendedAt !== null,
      suspensionReason: wallet.suspensionReason,
      suspendedAt: wallet.suspendedAt,
    };
  }

  /**
   * Suspends wallet (sets suspendedAt, suspensionReason, isActive=false)
   */
  async suspendWallet(organizationId: number, reason: string) {
    const wallet = await this.getWallet(organizationId);

    const [updatedWallet] = await db
      .update(organizationTokenWallets)
      .set({
        isActive: false,
        suspendedAt: new Date(),
        suspensionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(organizationTokenWallets.id, wallet.id))
      .returning();

    return updatedWallet;
  }

  /**
   * Reactivates suspended wallet
   */
  async reactivateWallet(organizationId: number) {
    const wallet = await this.getWallet(organizationId);

    const [updatedWallet] = await db
      .update(organizationTokenWallets)
      .set({
        isActive: true,
        suspendedAt: null,
        suspensionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationTokenWallets.id, wallet.id))
      .returning();

    return updatedWallet;
  }

  /**
   * Returns balance change history with filters
   */
  async getBalanceHistory(
    organizationId: number,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      changeType?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = db
      .select()
      .from(tokenBalanceHistory)
      .where(eq(tokenBalanceHistory.organizationId, organizationId))
      .$dynamic();

    if (filters?.startDate) {
      query = query.where(gte(tokenBalanceHistory.timestamp, filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where(lte(tokenBalanceHistory.timestamp, filters.endDate));
    }

    if (filters?.changeType) {
      query = query.where(eq(tokenBalanceHistory.changeType, filters.changeType));
    }

    query = query.orderBy(desc(tokenBalanceHistory.timestamp));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const history = await query;

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: tokenBalanceHistory.id })
      .from(tokenBalanceHistory)
      .where(eq(tokenBalanceHistory.organizationId, organizationId));

    return {
      history,
      total: count,
      limit: filters?.limit || history.length,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Calculates usage projection based on recent consumption
   */
  async calculateProjectedDepletion(organizationId: number) {
    const wallet = await this.getWallet(organizationId);
    const currentBalance = parseFloat(wallet.currentBalance);

    // Get consumption history for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const consumptionHistory = await db
      .select()
      .from(tokenBalanceHistory)
      .where(
        and(
          eq(tokenBalanceHistory.organizationId, organizationId),
          eq(tokenBalanceHistory.changeType, "consumption"),
          gte(tokenBalanceHistory.timestamp, thirtyDaysAgo)
        )
      );

    if (consumptionHistory.length === 0) {
      return {
        averageDailyConsumption: 0,
        projectedDaysRemaining: null,
        projectedDepletionDate: null,
        calculatedAt: new Date(),
      };
    }

    // Calculate total consumed in period
    const totalConsumed = consumptionHistory.reduce(
      (sum, entry) => sum + Math.abs(parseFloat(entry.changeAmount)),
      0
    );

    const averageDailyConsumption = totalConsumed / 30;

    let projectedDaysRemaining = null;
    let projectedDepletionDate = null;

    if (averageDailyConsumption > 0) {
      projectedDaysRemaining = Math.floor(currentBalance / averageDailyConsumption);

      projectedDepletionDate = new Date();
      projectedDepletionDate.setDate(
        projectedDepletionDate.getDate() + projectedDaysRemaining
      );
    }

    // Store forecast
    const forecast = {
      organizationId,
      periodStart: thirtyDaysAgo.toISOString().split("T")[0],
      periodEnd: new Date().toISOString().split("T")[0],
      tokensConsumed: totalConsumed.toFixed(2),
      averageDailyConsumption: averageDailyConsumption.toFixed(2),
      projectedDaysRemaining,
      projectedDepletionDate: projectedDepletionDate?.toISOString().split("T")[0] || null,
      calculatedAt: new Date(),
    };

    await db.insert(tokenUsageForecasts).values(forecast);

    return {
      averageDailyConsumption: parseFloat(forecast.averageDailyConsumption),
      projectedDaysRemaining,
      projectedDepletionDate: projectedDepletionDate?.toISOString().split("T")[0] || null,
      calculatedAt: forecast.calculatedAt,
    };
  }
}

export const tokenWalletService = new TokenWalletService();
