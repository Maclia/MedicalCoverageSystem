import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse,
  ValidationError
} from '../utils/api-standardization';
import { db } from '../config/database';
import { tokenPurchases, tokenSubscriptions, autoTopupPolicies } from '../models/schema';
import { eq, and, desc, gte, lte, count, sum } from 'drizzle-orm';

const logger = createLogger();

export interface TokenPurchaseData {
  organizationId: number;
  purchasedBy: number;
  purchaseType: 'one-time' | 'subscription' | 'auto-topup';
  tokenQuantity: number;
  pricePerToken: number;
  totalAmount: number;
  currency?: string;
  packageId?: number;
  paymentMethodId: number;
  gatewayProvider?: string;
  gatewayTransactionId?: string;
  tokenExpirationDate?: Date;
  metadata?: any;
}

export interface TokenSubscriptionData {
  organizationId: number;
  packageId: number;
  tokenQuantity: number;
  pricePerToken: number;
  totalAmount: number;
  currency?: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  paymentMethodId: number;
  nextBillingDate: Date;
  metadata?: any;
}

export interface AutoTopupPolicyData {
  organizationId: number;
  isEnabled: boolean;
  triggerType: 'percentage-based' | 'schedule-based';
  thresholdPercentage?: number;
  scheduleFrequency?: string;
  topupPackageId?: number;
  topupTokenQuantity?: number;
  paymentMethodId: number;
  maxSpendingLimitPerMonth?: number;
  invoiceEnabled?: boolean;
}

export class TokenBillingService {
  private static instance: TokenBillingService;

  public static getInstance(): TokenBillingService {
    if (!TokenBillingService.instance) {
      TokenBillingService.instance = new TokenBillingService();
    }
    return TokenBillingService.instance;
  }

  /**
   * Generate unique purchase reference ID
   */
  private generatePurchaseReferenceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7).toUpperCase();
    return `TOKEN-${timestamp}-${random}`;
  }

  /**
   * Process a one-time token purchase
   */
  async processPurchase(data: TokenPurchaseData) {
    try {
      const errors = this.validatePurchaseData(data);
      if (errors.length > 0) {
        return createValidationErrorResponse(this.formatValidationErrors(errors));
      }

      const purchaseReferenceId = this.generatePurchaseReferenceId();

      const purchase = await db
        .insert(tokenPurchases)
        .values({
          purchaseReferenceId,
          organizationId: data.organizationId,
          purchasedBy: data.purchasedBy,
          purchaseType: data.purchaseType,
          tokenQuantity: data.tokenQuantity.toString(),
          pricePerToken: data.pricePerToken.toString(),
          totalAmount: data.totalAmount.toString(),
          currency: data.currency || 'USD',
          packageId: data.packageId,
          paymentMethodId: data.paymentMethodId,
          gatewayProvider: data.gatewayProvider,
          gatewayTransactionId: data.gatewayTransactionId,
          tokenExpirationDate: data.tokenExpirationDate,
          status: 'pending',
          paymentInitiatedAt: new Date(),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      logger.info(`Token purchase created: ${purchaseReferenceId}`, {
        organizationId: data.organizationId,
        amount: data.totalAmount,
        quantity: data.tokenQuantity
      });

      return ResponseFactory.createSuccessResponse(purchase[0], 'Token purchase initiated successfully');
    } catch (error) {
      logger.error('Error processing token purchase:', error);
      return ResponseFactory.createServerErrorResponse('Failed to process token purchase');
    }
  }

  /**
   * Complete a token purchase after payment
   */
  async completePurchase(purchaseId: number, gatewayTransactionId: string) {
    try {
      const purchase = await db
        .select()
        .from(tokenPurchases)
        .where(eq(tokenPurchases.id, purchaseId))
        .limit(1);

      if (!purchase.length) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Purchase not found');
      }

      const updated = await db
        .update(tokenPurchases)
        .set({
          status: 'completed',
          gatewayTransactionId,
          paymentCompletedAt: new Date(),
          tokensAllocatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tokenPurchases.id, purchaseId))
        .returning();

      logger.info(`Token purchase completed: ${purchase[0].purchaseReferenceId}`, {
        transactionId: gatewayTransactionId
      });

      return ResponseFactory.createSuccessResponse(updated[0], 'Token purchase completed');
    } catch (error) {
      logger.error('Error completing token purchase:', error);
      return ResponseFactory.createServerErrorResponse('Failed to complete purchase');
    }
  }

  /**
   * Create a token subscription
   */
  async createSubscription(data: TokenSubscriptionData) {
    try {
      const errors = this.validateSubscriptionData(data);
      if (errors.length > 0) {
        return createValidationErrorResponse(this.formatValidationErrors(errors));
      }

      const subscription = await db
        .insert(tokenSubscriptions)
        .values({
          organizationId: data.organizationId,
          packageId: data.packageId,
          tokenQuantity: data.tokenQuantity.toString(),
          pricePerToken: data.pricePerToken.toString(),
          totalAmount: data.totalAmount.toString(),
          currency: data.currency || 'USD',
          frequency: data.frequency,
          paymentMethodId: data.paymentMethodId,
          nextBillingDate: data.nextBillingDate,
          status: 'active',
          startedAt: new Date(),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      logger.info(`Token subscription created for organization ${data.organizationId}`, {
        subscriptionId: subscription[0].id,
        frequency: data.frequency,
        amount: data.totalAmount
      });

      return ResponseFactory.createSuccessResponse(subscription[0], 'Subscription created successfully');
    } catch (error) {
      logger.error('Error creating subscription:', error);
      return ResponseFactory.createServerErrorResponse('Failed to create subscription');
    }
  }

  /**
   * Process recurring subscription billing
   */
  async processBilling(subscriptionId: number) {
    try {
      const subscription = await db
        .select()
        .from(tokenSubscriptions)
        .where(eq(tokenSubscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Subscription not found');
      }

      const sub = subscription[0];
      if (!sub) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Subscription not found');
      }

      // Create token purchase record
      const purchase = await db
        .insert(tokenPurchases)
        .values({
          purchaseReferenceId: this.generatePurchaseReferenceId(),
          organizationId: sub.organizationId,
          purchasedBy: null,
          purchaseType: 'subscription',
          tokenQuantity: sub.tokenQuantity,
          pricePerToken: sub.pricePerToken,
          totalAmount: sub.totalAmount,
          currency: sub.currency,
          packageId: sub.packageId,
          paymentMethodId: sub.paymentMethodId,
          subscriptionId: sub.id,
          status: 'processing',
          paymentInitiatedAt: new Date(),
        })
        .returning();

      // Process via payment gateway - this would integrate with actual payment processor
      const nextBillingDate = this.calculateNextBillingDate(sub.frequency, new Date());

      const updatedSub = await db
        .update(tokenSubscriptions)
        .set({
          lastBillingDate: new Date(),
          nextBillingDate,
          failedPaymentCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(tokenSubscriptions.id, subscriptionId))
        .returning();

      logger.info(`Subscription billing processed for subscription ${subscriptionId}`, {
        purchaseId: purchase[0].id,
        nextBillingDate
      });

      return ResponseFactory.createSuccessResponse(
        { subscription: updatedSub[0], purchase: purchase[0] },
        'Billing processed successfully'
      );
    } catch (error) {
      logger.error('Error processing subscription billing:', error);
      return ResponseFactory.createServerErrorResponse('Failed to process billing');
    }
  }

  /**
   * Setup auto-topup policy
   */
  async setupAutoTopup(data: AutoTopupPolicyData) {
    try {
      const errors = this.validateAutoTopupData(data);
      if (errors.length > 0) {
        return createValidationErrorResponse(this.formatValidationErrors(errors));
      }

      // Check if policy already exists
      const existing = await db
        .select()
        .from(autoTopupPolicies)
        .where(eq(autoTopupPolicies.organizationId, data.organizationId))
        .limit(1);

      if (existing.length) {
        // Update existing policy
        const updated = await db
          .update(autoTopupPolicies)
          .set({
            isEnabled: data.isEnabled,
            triggerType: data.triggerType,
            thresholdPercentage: data.thresholdPercentage?.toString(),
            scheduleFrequency: data.scheduleFrequency,
            topupPackageId: data.topupPackageId,
            topupTokenQuantity: data.topupTokenQuantity?.toString(),
            paymentMethodId: data.paymentMethodId,
            maxSpendingLimitPerMonth: data.maxSpendingLimitPerMonth?.toString(),
            invoiceEnabled: data.invoiceEnabled,
            updatedAt: new Date(),
          })
          .where(eq(autoTopupPolicies.organizationId, data.organizationId))
          .returning();

        logger.info(`Auto-topup policy updated for organization ${data.organizationId}`);
        return ResponseFactory.createSuccessResponse(updated[0], 'Auto-topup policy updated');
      }

      const policy = await db
        .insert(autoTopupPolicies)
        .values({
          organizationId: data.organizationId,
          isEnabled: data.isEnabled,
          triggerType: data.triggerType,
          thresholdPercentage: data.thresholdPercentage?.toString(),
          scheduleFrequency: data.scheduleFrequency,
          topupPackageId: data.topupPackageId,
          topupTokenQuantity: data.topupTokenQuantity?.toString(),
          paymentMethodId: data.paymentMethodId,
          maxSpendingLimitPerMonth: data.maxSpendingLimitPerMonth?.toString(),
          invoiceEnabled: data.invoiceEnabled,
        })
        .returning();

      logger.info(`Auto-topup policy created for organization ${data.organizationId}`);
      return ResponseFactory.createSuccessResponse(policy[0], 'Auto-topup policy created');
    } catch (error) {
      logger.error('Error setting up auto-topup:', error);
      return ResponseFactory.createServerErrorResponse('Failed to setup auto-topup');
    }
  }

  /**
   * Get token purchases for organization
   */
  async getPurchases(organizationId: number, filters?: any) {
    try {
      let query = db
        .select()
        .from(tokenPurchases)
        .where(eq(tokenPurchases.organizationId, organizationId));

      if (filters?.status) {
        query = query.where(eq(tokenPurchases.status, filters.status));
      }

      if (filters?.startDate) {
        query = query.where(gte(tokenPurchases.createdAt, filters.startDate));
      }

      if (filters?.endDate) {
        query = query.where(lte(tokenPurchases.createdAt, filters.endDate));
      }

      const purchases = await query.orderBy(desc(tokenPurchases.createdAt));

      return ResponseFactory.createSuccessResponse(purchases, 'Purchases retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving purchases:', error);
      return ResponseFactory.createServerErrorResponse('Failed to retrieve purchases');
    }
  }

  /**
   * Get token subscription details
   */
  async getSubscription(subscriptionId: number) {
    try {
      const subscription = await db
        .select()
        .from(tokenSubscriptions)
        .where(eq(tokenSubscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Subscription not found');
      }

      return ResponseFactory.createSuccessResponse(subscription[0], 'Subscription retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving subscription:', error);
      return ResponseFactory.createServerErrorResponse('Failed to retrieve subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: number, cancelledBy: number, reason: string) {
    try {
      const subscription = await db
        .select()
        .from(tokenSubscriptions)
        .where(eq(tokenSubscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Subscription not found');
      }

      const cancelled = await db
        .update(tokenSubscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy,
          cancellationReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(tokenSubscriptions.id, subscriptionId))
        .returning();

      logger.info(`Subscription cancelled: ${subscriptionId}`, {
        reason: reason
      });

      return ResponseFactory.createSuccessResponse(cancelled[0], 'Subscription cancelled successfully');
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      return ResponseFactory.createServerErrorResponse('Failed to cancel subscription');
    }
  }

  /**
   * Get billing statistics for organization
   */
  async getBillingStats(organizationId: number) {
    try {
      const totalPurchases = await db
        .select({ count: count() })
        .from(tokenPurchases)
        .where(
          and(
            eq(tokenPurchases.organizationId, organizationId),
            eq(tokenPurchases.status, 'completed')
          )
        );

      const totalSpent = await db
        .select({ total: sum(tokenPurchases.totalAmount) })
        .from(tokenPurchases)
        .where(
          and(
            eq(tokenPurchases.organizationId, organizationId),
            eq(tokenPurchases.status, 'completed')
          )
        );

      const activeSubscriptions = await db
        .select({ count: count() })
        .from(tokenSubscriptions)
        .where(
          and(
            eq(tokenSubscriptions.organizationId, organizationId),
            eq(tokenSubscriptions.status, 'active')
          )
        );

      return ResponseFactory.createSuccessResponse({
        totalPurchases: totalPurchases[0]?.count || 0,
        totalSpent: totalSpent[0]?.total || 0,
        activeSubscriptions: activeSubscriptions[0]?.count || 0,
      }, 'Billing statistics retrieved');
    } catch (error) {
      logger.error('Error retrieving billing stats:', error);
      return ResponseFactory.createServerErrorResponse('Failed to retrieve statistics');
    }
  }

  // ===== Private Validation Methods =====

  private validatePurchaseData(data: TokenPurchaseData): string[] {
    const errors: string[] = [];

    if (!data.organizationId || data.organizationId <= 0) {
      errors.push('Valid organization ID is required');
    }
    if (!data.purchasedBy || data.purchasedBy <= 0) {
      errors.push('Valid purchased by user ID is required');
    }
    if (!data.purchaseType) {
      errors.push('Purchase type is required');
    }
    if (!data.tokenQuantity || data.tokenQuantity <= 0) {
      errors.push('Token quantity must be greater than 0');
    }
    if (!data.pricePerToken || data.pricePerToken <= 0) {
      errors.push('Price per token must be greater than 0');
    }
    if (!data.totalAmount || data.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }
    if (!data.paymentMethodId || data.paymentMethodId <= 0) {
      errors.push('Valid payment method is required');
    }

    return errors;
  }

  private validateSubscriptionData(data: TokenSubscriptionData): string[] {
    const errors: string[] = [];

    if (!data.organizationId || data.organizationId <= 0) {
      errors.push('Valid organization ID is required');
    }
    if (!data.packageId || data.packageId <= 0) {
      errors.push('Valid package ID is required');
    }
    if (!data.tokenQuantity || data.tokenQuantity <= 0) {
      errors.push('Token quantity must be greater than 0');
    }
    if (!data.pricePerToken || data.pricePerToken <= 0) {
      errors.push('Price per token must be greater than 0');
    }
    if (!data.totalAmount || data.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }
    if (!['weekly', 'monthly', 'quarterly', 'annual'].includes(data.frequency)) {
      errors.push('Invalid frequency');
    }
    if (!data.paymentMethodId || data.paymentMethodId <= 0) {
      errors.push('Valid payment method is required');
    }
    if (!data.nextBillingDate) {
      errors.push('Next billing date is required');
    }

    return errors;
  }

  private validateAutoTopupData(data: AutoTopupPolicyData): string[] {
    const errors: string[] = [];

    if (!data.organizationId || data.organizationId <= 0) {
      errors.push('Valid organization ID is required');
    }
    if (!data.triggerType) {
      errors.push('Trigger type is required');
    }
    if (!data.paymentMethodId || data.paymentMethodId <= 0) {
      errors.push('Valid payment method is required');
    }
    if (data.triggerType === 'percentage-based' && !data.thresholdPercentage) {
      errors.push('Threshold percentage required for percentage-based trigger');
    }

    return errors;
  }

  /**
   * Calculate next billing date based on frequency
   */
  private calculateNextBillingDate(frequency: string, from: Date): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  /**
   * Format validation errors to ValidationError[] format
   */
  private formatValidationErrors(errors: string[]): ValidationError[] {
    return errors.map((message, index) => ({
      field: `field_${index}`,
      message: message,
      value: undefined
    }));
  }
}

export const tokenBillingService = TokenBillingService.getInstance();
