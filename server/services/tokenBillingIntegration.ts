/**
 * Token Billing Integration Service
 * Integrates token purchases with the finance/billing system
 * Generates invoices for token purchases and tracks revenue
 */

import { db } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { tokenPurchases, tokenSubscriptions, companies } from "../../shared/schema";
import type { TokenPurchase, TokenSubscription } from "../api/tokens";

// Invoice interface matching billing service
export interface TokenInvoice {
  id?: number;
  invoiceNumber: string;
  companyId: number;
  purchaseReferenceId?: string;
  subscriptionId?: number;
  invoiceType: 'token_purchase' | 'token_subscription';
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  lineItems: TokenInvoiceLineItem[];
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

export interface TokenInvoiceLineItem {
  id?: number;
  invoiceId: number;
  itemType: 'tokens' | 'subscription_fee' | 'tax';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, any>;
}

export interface TokenRevenueReport {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  oneTimePurchaseRevenue: number;
  subscriptionRevenue: number;
  autoTopupRevenue: number;
  tokensSold: number;
  purchaseCount: number;
  activeSubscriptions: number;
  currency: string;
}

export class TokenBillingIntegration {
  private invoiceSequence = 5000;

  /**
   * Generate invoice for token purchase
   */
  async generateTokenPurchaseInvoice(purchaseReferenceId: string): Promise<TokenInvoice> {
    const purchase = await db.query.tokenPurchases.findFirst({
      where: eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId),
    });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseReferenceId} not found`);
    }

    if (purchase.invoiceId) {
      throw new Error(`Invoice already generated for purchase ${purchaseReferenceId}`);
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, purchase.organizationId),
    });

    if (!company) {
      throw new Error(`Company ${purchase.organizationId} not found`);
    }

    // Calculate amounts
    const subtotal = parseFloat(purchase.totalAmount);
    const taxRate = this.getTaxRate(company);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create line items
    const lineItems: TokenInvoiceLineItem[] = [
      {
        invoiceId: 0, // Will be set when saved
        itemType: 'tokens',
        description: `${purchase.tokenQuantity} tokens @ ${purchase.pricePerToken} ${purchase.currency} each`,
        quantity: parseFloat(purchase.tokenQuantity),
        unitPrice: parseFloat(purchase.pricePerToken),
        amount: subtotal,
        metadata: {
          purchaseType: purchase.purchaseType,
          packageId: purchase.packageId,
          purchaseReferenceId: purchase.purchaseReferenceId,
        },
      },
    ];

    if (taxAmount > 0) {
      lineItems.push({
        invoiceId: 0,
        itemType: 'tax',
        description: `Tax (${(taxRate * 100).toFixed(1)}%)`,
        quantity: 1,
        unitPrice: taxAmount,
        amount: taxAmount,
      });
    }

    const invoiceNumber = this.generateInvoiceNumber('TOK');
    const issueDate = new Date();
    const dueDate = this.calculateDueDate(issueDate, company);

    const invoice: TokenInvoice = {
      invoiceNumber,
      companyId: purchase.organizationId,
      purchaseReferenceId: purchase.purchaseReferenceId,
      invoiceType: 'token_purchase',
      issueDate,
      dueDate,
      status: purchase.status === 'completed' ? 'paid' : 'draft',
      subtotal,
      taxAmount,
      totalAmount,
      currency: purchase.currency,
      lineItems,
      paymentReference: purchase.gatewayTransactionId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: purchase.paymentCompletedAt ? new Date(purchase.paymentCompletedAt) : undefined,
    };

    // Save invoice (in real implementation, would save to invoices table)
    const savedInvoice = await this.saveInvoice(invoice);

    // Update purchase with invoice ID
    await db
      .update(tokenPurchases)
      .set({
        invoiceId: savedInvoice.id,
        updatedAt: new Date(),
      })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    return savedInvoice;
  }

  /**
   * Generate invoice for subscription billing
   */
  async generateSubscriptionInvoice(subscriptionId: number): Promise<TokenInvoice> {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: eq(tokenSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, subscription.organizationId),
    });

    if (!company) {
      throw new Error(`Company ${subscription.organizationId} not found`);
    }

    const subtotal = parseFloat(subscription.totalAmount);
    const taxRate = this.getTaxRate(company);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const lineItems: TokenInvoiceLineItem[] = [
      {
        invoiceId: 0,
        itemType: 'subscription_fee',
        description: `Token Subscription (${subscription.frequency}) - ${subscription.tokenQuantity} tokens`,
        quantity: parseFloat(subscription.tokenQuantity),
        unitPrice: parseFloat(subscription.pricePerToken),
        amount: subtotal,
        metadata: {
          subscriptionId: subscription.id,
          frequency: subscription.frequency,
          nextBillingDate: subscription.nextBillingDate,
        },
      },
    ];

    if (taxAmount > 0) {
      lineItems.push({
        invoiceId: 0,
        itemType: 'tax',
        description: `Tax (${(taxRate * 100).toFixed(1)}%)`,
        quantity: 1,
        unitPrice: taxAmount,
        amount: taxAmount,
      });
    }

    const invoiceNumber = this.generateInvoiceNumber('TOKSUB');
    const issueDate = new Date();
    const dueDate = this.calculateDueDate(issueDate, company);

    const invoice: TokenInvoice = {
      invoiceNumber,
      companyId: subscription.organizationId,
      subscriptionId: subscription.id,
      invoiceType: 'token_subscription',
      issueDate,
      dueDate,
      status: 'draft',
      subtotal,
      taxAmount,
      totalAmount,
      currency: subscription.currency,
      lineItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.saveInvoice(invoice);
  }

  /**
   * Calculate token revenue for period
   */
  async calculateTokenRevenue(
    startDate: Date,
    endDate: Date,
    organizationId?: number
  ): Promise<TokenRevenueReport> {
    let query = db
      .select()
      .from(tokenPurchases)
      .where(
        and(
          eq(tokenPurchases.status, 'completed'),
          gte(tokenPurchases.paymentCompletedAt, startDate),
          lte(tokenPurchases.paymentCompletedAt, endDate)
        )
      )
      .$dynamic();

    if (organizationId) {
      query = query.where(eq(tokenPurchases.organizationId, organizationId));
    }

    const purchases = await query;

    // Calculate revenue breakdown
    let totalRevenue = 0;
    let oneTimePurchaseRevenue = 0;
    let subscriptionRevenue = 0;
    let autoTopupRevenue = 0;
    let tokensSold = 0;

    for (const purchase of purchases) {
      const amount = parseFloat(purchase.totalAmount);
      totalRevenue += amount;
      tokensSold += parseFloat(purchase.tokenQuantity);

      switch (purchase.purchaseType) {
        case 'one_time':
          oneTimePurchaseRevenue += amount;
          break;
        case 'subscription':
          subscriptionRevenue += amount;
          break;
        case 'auto_topup':
          autoTopupRevenue += amount;
          break;
      }
    }

    // Get active subscriptions count
    const activeSubscriptionsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(tokenSubscriptions)
      .where(eq(tokenSubscriptions.status, 'active'))
      .$dynamic();

    if (organizationId) {
      activeSubscriptionsQuery.where(eq(tokenSubscriptions.organizationId, organizationId));
    }

    const [{ count: activeSubscriptions }] = await activeSubscriptionsQuery;

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalRevenue,
      oneTimePurchaseRevenue,
      subscriptionRevenue,
      autoTopupRevenue,
      tokensSold,
      purchaseCount: purchases.length,
      activeSubscriptions: Number(activeSubscriptions),
      currency: purchases[0]?.currency || 'USD',
    };
  }

  /**
   * Get token revenue by month
   */
  async getMonthlyTokenRevenue(
    year: number,
    organizationId?: number
  ): Promise<{ month: number; revenue: number; tokensSold: number }[]> {
    const monthlyData: { month: number; revenue: number; tokensSold: number }[] = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const report = await this.calculateTokenRevenue(startDate, endDate, organizationId);

      monthlyData.push({
        month: month + 1,
        revenue: report.totalRevenue,
        tokensSold: report.tokensSold,
      });
    }

    return monthlyData;
  }

  /**
   * Get top token purchasers
   */
  async getTopTokenPurchasers(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<{ organizationId: number; companyName: string; totalSpent: number; tokensPurchased: number }[]> {
    const purchases = await db
      .select()
      .from(tokenPurchases)
      .where(
        and(
          eq(tokenPurchases.status, 'completed'),
          gte(tokenPurchases.paymentCompletedAt, startDate),
          lte(tokenPurchases.paymentCompletedAt, endDate)
        )
      );

    // Group by organization
    const orgMap = new Map<
      number,
      { totalSpent: number; tokensPurchased: number; companyName: string }
    >();

    for (const purchase of purchases) {
      if (!orgMap.has(purchase.organizationId)) {
        const company = await db.query.companies.findFirst({
          where: eq(companies.id, purchase.organizationId),
        });

        orgMap.set(purchase.organizationId, {
          totalSpent: 0,
          tokensPurchased: 0,
          companyName: company?.companyName || `Organization ${purchase.organizationId}`,
        });
      }

      const orgData = orgMap.get(purchase.organizationId)!;
      orgData.totalSpent += parseFloat(purchase.totalAmount);
      orgData.tokensPurchased += parseFloat(purchase.tokenQuantity);
    }

    // Convert to array and sort
    const topPurchasers = Array.from(orgMap.entries())
      .map(([organizationId, data]) => ({
        organizationId,
        companyName: data.companyName,
        totalSpent: data.totalSpent,
        tokensPurchased: data.tokensPurchased,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return topPurchasers;
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(prefix: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = this.invoiceSequence++;
    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Get tax rate for company
   */
  private getTaxRate(company: any): number {
    return company.taxRate || 0.08; // Default 8% tax
  }

  /**
   * Calculate due date
   */
  private calculateDueDate(issueDate: Date, company: any): Date {
    const dueDate = new Date(issueDate);
    const terms = company.billingTerms || 'NET_30';

    switch (terms) {
      case 'NET_15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'NET_30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'NET_45':
        dueDate.setDate(dueDate.getDate() + 45);
        break;
      case 'NET_60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30);
    }

    return dueDate;
  }

  /**
   * Save invoice to database
   */
  private async saveInvoice(invoice: TokenInvoice): Promise<TokenInvoice> {
    // In a real implementation, this would save to the invoices table
    // For now, generate an ID and return
    const savedInvoice = {
      ...invoice,
      id: Math.floor(Math.random() * 100000) + 50000,
    };

    return savedInvoice;
  }

  /**
   * Get invoice by number
   */
  async getInvoice(invoiceNumber: string): Promise<TokenInvoice | null> {
    // Would retrieve from database
    return null;
  }

  /**
   * Get invoices for organization
   */
  async getOrganizationInvoices(
    organizationId: number,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TokenInvoice[]> {
    // Would retrieve from database with filters
    return [];
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(
    invoiceId: number,
    paymentReference: string,
    paidAt: Date
  ): Promise<void> {
    // Would update database
    console.log(`Marking invoice ${invoiceId} as paid. Ref: ${paymentReference}`);
  }
}

export const tokenBillingIntegration = new TokenBillingIntegration();
