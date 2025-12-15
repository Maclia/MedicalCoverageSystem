import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../db";
import { auditLogs, tokenPurchases, tokenBalanceHistory } from "../../shared/schema";

export class TokenAuditService {
  /**
   * Log purchase event
   */
  async logPurchaseEvent(
    purchaseId: number,
    event: string,
    userId?: number,
    metadata?: any
  ) {
    await db.insert(auditLogs).values({
      userId: userId || null,
      action: event,
      resource: "token_purchase",
      resourceId: purchaseId.toString(),
      timestamp: new Date(),
    });
  }

  /**
   * Log balance change event
   */
  async logBalanceChange(historyId: number, userId?: number) {
    const history = await db.query.tokenBalanceHistory.findFirst({
      where: eq(tokenBalanceHistory.id, historyId),
    });

    if (!history) {
      throw new Error(`Balance history ${historyId} not found`);
    }

    await db.insert(auditLogs).values({
      userId: userId || null,
      action: "balance_change",
      resource: "token_balance",
      resourceId: historyId.toString(),
      timestamp: new Date(),
    });
  }

  /**
   * Log policy change event
   */
  async logPolicyChange(
    policyId: number,
    changeType: string,
    userId: number,
    metadata?: any
  ) {
    await db.insert(auditLogs).values({
      userId,
      action: `policy_${changeType}`,
      resource: "auto_topup_policy",
      resourceId: policyId.toString(),
      timestamp: new Date(),
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ) {
    // Get all purchases in date range
    const purchases = await db
      .select()
      .from(tokenPurchases)
      .where(
        and(
          eq(tokenPurchases.organizationId, organizationId),
          gte(tokenPurchases.createdAt, startDate),
          lte(tokenPurchases.createdAt, endDate)
        )
      )
      .orderBy(desc(tokenPurchases.createdAt));

    // Get all balance changes in date range
    const balanceChanges = await db
      .select()
      .from(tokenBalanceHistory)
      .where(
        and(
          eq(tokenBalanceHistory.organizationId, organizationId),
          gte(tokenBalanceHistory.timestamp, startDate),
          lte(tokenBalanceHistory.timestamp, endDate)
        )
      )
      .orderBy(desc(tokenBalanceHistory.timestamp));

    // Get audit logs related to token operations
    const auditEntries = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.timestamp, startDate),
          lte(auditLogs.timestamp, endDate)
        )
      )
      .orderBy(desc(auditLogs.timestamp));

    // Calculate summary statistics
    const totalPurchaseAmount = purchases.reduce(
      (sum, p) => sum + parseFloat(p.totalAmount),
      0
    );

    const totalTokensPurchased = purchases.reduce(
      (sum, p) => sum + parseFloat(p.tokenQuantity),
      0
    );

    const totalTokensConsumed = balanceChanges
      .filter((bc) => bc.changeType === "consumption")
      .reduce((sum, bc) => sum + Math.abs(parseFloat(bc.changeAmount)), 0);

    return {
      organizationId,
      periodStart: startDate,
      periodEnd: endDate,
      summary: {
        totalPurchases: purchases.length,
        totalPurchaseAmount,
        totalTokensPurchased,
        totalTokensConsumed,
        completedPurchases: purchases.filter((p) => p.status === "completed").length,
        failedPurchases: purchases.filter((p) => p.status === "failed").length,
      },
      purchases,
      balanceChanges,
      auditLog: auditEntries.filter(
        (log) =>
          log.resource === "token_purchase" ||
          log.resource === "token_balance" ||
          log.resource === "auto_topup_policy"
      ),
    };
  }

  /**
   * Get audit trail for specific purchase
   */
  async getPurchaseAuditTrail(purchaseReferenceId: string) {
    const purchase = await db.query.tokenPurchases.findFirst({
      where: eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId),
    });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseReferenceId} not found`);
    }

    const auditEntries = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resource, "token_purchase"),
          eq(auditLogs.resourceId, purchase.id.toString())
        )
      )
      .orderBy(desc(auditLogs.timestamp));

    return {
      purchase,
      auditTrail: auditEntries,
    };
  }

  /**
   * Get audit trail for organization
   */
  async getOrganizationAuditTrail(
    organizationId: number,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      resource?: string;
      limit?: number;
    }
  ) {
    let query = db.select().from(auditLogs).$dynamic();

    if (filters?.startDate) {
      query = query.where(gte(auditLogs.timestamp, filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where(lte(auditLogs.timestamp, filters.endDate));
    }

    if (filters?.resource) {
      query = query.where(eq(auditLogs.resource, filters.resource));
    }

    query = query.orderBy(desc(auditLogs.timestamp));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const entries = await query;

    // Filter to only token-related entries for this organization
    // This requires joining with token tables to verify organization
    // For now, return all entries
    return entries.filter(
      (e) =>
        e.resource === "token_purchase" ||
        e.resource === "token_balance" ||
        e.resource === "auto_topup_policy" ||
        e.resource === "token_subscription"
    );
  }
}

export const tokenAuditService = new TokenAuditService();
