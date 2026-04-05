import { Request, Response } from 'express';
import { z } from 'zod';
import { tokenBillingService, TokenPurchaseData, TokenSubscriptionData, AutoTopupPolicyData } from '../services/TokenBillingService';
import { db } from '../config/database';
import { autoTopupPolicies } from '../models/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger';
import { ResponseFactory, createValidationErrorResponse, ErrorCodes } from '../utils/api-standardization';

const logger = createLogger();

// ===== Validation Schemas =====

const createPurchaseSchema = z.object({
  organizationId: z.number().int().positive(),
  purchasedBy: z.number().int().positive(),
  purchaseType: z.enum(['one-time', 'subscription', 'auto-topup']),
  tokenQuantity: z.number().positive(),
  pricePerToken: z.number().positive(),
  totalAmount: z.number().positive(),
  currency: z.string().optional().default('USD'),
  packageId: z.number().int().positive().optional(),
  paymentMethodId: z.number().int().positive(),
  gatewayProvider: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  tokenExpirationDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const createSubscriptionSchema = z.object({
  organizationId: z.number().int().positive(),
  packageId: z.number().int().positive(),
  tokenQuantity: z.number().positive(),
  pricePerToken: z.number().positive(),
  totalAmount: z.number().positive(),
  currency: z.string().optional().default('USD'),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
  paymentMethodId: z.number().int().positive(),
  nextBillingDate: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

const setupAutoTopupSchema = z.object({
  organizationId: z.number().int().positive(),
  isEnabled: z.boolean(),
  triggerType: z.enum(['percentage-based', 'schedule-based']),
  thresholdPercentage: z.number().positive().optional(),
  scheduleFrequency: z.string().optional(),
  topupPackageId: z.number().int().positive().optional(),
  topupTokenQuantity: z.number().positive().optional(),
  paymentMethodId: z.number().int().positive(),
  maxSpendingLimitPerMonth: z.number().positive().optional(),
  invoiceEnabled: z.boolean().optional(),
});

const cancelSubscriptionSchema = z.object({
  cancelledBy: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

const completePurchaseSchema = z.object({
  gatewayTransactionId: z.string().min(1),
});

// ===== Validation Middleware =====

export class TokenBillingValidationMiddleware {
  static validateCreatePurchase(req: Request, res: Response, next: Function) {
    try {
      const validated = createPurchaseSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors?.map((err: any) => err.message) || ['Invalid request body'];
      res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors));
    }
  }

  static validateCreateSubscription(req: Request, res: Response, next: Function) {
    try {
      const validated = createSubscriptionSchema.parse(req.body);
      req.body.nextBillingDate = new Date(validated.nextBillingDate);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors?.map((err: any) => err.message) || ['Invalid request body'];
      res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors));
    }
  }

  static validateSetupAutoTopup(req: Request, res: Response, next: Function) {
    try {
      const validated = setupAutoTopupSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors?.map((err: any) => err.message) || ['Invalid request body'];
      res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors));
    }
  }

  static validateCancelSubscription(req: Request, res: Response, next: Function) {
    try {
      const validated = cancelSubscriptionSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors?.map((err: any) => err.message) || ['Invalid request body'];
      res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors));
    }
  }

  static validateCompletePurchase(req: Request, res: Response, next: Function) {
    try {
      const validated = completePurchaseSchema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors?.map((err: any) => err.message) || ['Invalid request body'];
      res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors));
    }
  }
}

// ===== Controller =====

export class TokenBillingController {
  /**
   * Create a token purchase
   * POST /tokens/purchases
   */
  static async createPurchase(req: Request, res: Response) {
    try {
      const result = await tokenBillingService.processPurchase(req.body as TokenPurchaseData);
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in createPurchase:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create purchase'));
    }
  }

  /**
   * Complete a token purchase payment
   * POST /tokens/purchases/:id/complete
   */
  static async completePurchase(req: Request, res: Response) {
    try {
      const purchaseId = parseInt(req.params.id);
      const { gatewayTransactionId } = req.body;

      const result = await tokenBillingService.completePurchase(purchaseId, gatewayTransactionId);
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in completePurchase:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to complete purchase'));
    }
  }

  /**
   * Get token purchases for organization
   * GET /tokens/purchases?organizationId=1&status=completed
   */
  static async getPurchases(req: Request, res: Response) {
    try {
      const organizationId = parseInt(req.query.organizationId as string);
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await tokenBillingService.getPurchases(organizationId, filters);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error in getPurchases:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve purchases'));
    }
  }

  /**
   * Get a specific purchase by ID
   * GET /tokens/purchases/:id
   */
  static async getPurchase(req: Request, res: Response) {
    try {
      const purchaseId = parseInt(req.params.id);
      const organizationId = parseInt(req.query.organizationId as string);

      const result = await tokenBillingService.getPurchases(organizationId);
      if (result.success && Array.isArray(result.data)) {
        const purchase = result.data.find((p: any) => p.id === purchaseId);
        if (purchase) {
          res.json(ResponseFactory.createSuccessResponse(purchase, 'Purchase retrieved'));
        } else {
          res.status(404).json(ResponseFactory.createErrorResponse('NOT_FOUND', 'Purchase not found'));
        }
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error in getPurchase:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve purchase'));
    }
  }

  /**
   * Create a token subscription
   * POST /tokens/subscriptions
   */
  static async createSubscription(req: Request, res: Response) {
    try {
      const result = await tokenBillingService.createSubscription(req.body as TokenSubscriptionData);
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in createSubscription:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create subscription'));
    }
  }

  /**
   * Get token subscription details
   * GET /tokens/subscriptions/:id
   */
  static async getSubscription(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const result = await tokenBillingService.getSubscription(subscriptionId);
      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in getSubscription:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve subscription'));
    }
  }

  /**
   * Process subscription billing
   * POST /tokens/subscriptions/:id/bill
   */
  static async processBilling(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const result = await tokenBillingService.processBilling(subscriptionId);
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in processBilling:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to process billing'));
    }
  }

  /**
   * Cancel token subscription
   * POST /tokens/subscriptions/:id/cancel
   */
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { cancelledBy, reason } = req.body;

      const result = await tokenBillingService.cancelSubscription(subscriptionId, cancelledBy, reason);
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in cancelSubscription:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to cancel subscription'));
    }
  }

  /**
   * Setup auto-topup policy
   * POST /tokens/auto-topup
   */
  static async setupAutoTopup(req: Request, res: Response) {
    try {
      const result = await tokenBillingService.setupAutoTopup(req.body as AutoTopupPolicyData);
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Error in setupAutoTopup:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to setup auto-topup'));
    }
  }

  /**
   * Get auto-topup policy
   * GET /tokens/auto-topup?organizationId=1
   */
  static async getAutoTopupPolicy(req: Request, res: Response) {
    try {
      const organizationId = parseInt(req.query.organizationId as string);
      
      if (!organizationId || organizationId <= 0) {
        return res.status(400).json(ResponseFactory.createErrorResponse(ErrorCodes.BAD_REQUEST, 'Valid organizationId is required'));
      }

      const policy = await db
        .select()
        .from(autoTopupPolicies)
        .where(eq(autoTopupPolicies.organizationId, organizationId))
        .limit(1);

      const policyData = policy.length > 0 ? policy[0] : null;
      res.json(ResponseFactory.createSuccessResponse(policyData, 'Auto-topup policy retrieved'));
    } catch (error) {
      logger.error('Error in getAutoTopupPolicy:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve auto-topup policy'));
    }
  }

  /**
   * Get billing statistics for organization
   * GET /tokens/stats?organizationId=1
   */
  static async getBillingStats(req: Request, res: Response) {
    try {
      const organizationId = parseInt(req.query.organizationId as string);
      const result = await tokenBillingService.getBillingStats(organizationId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error in getBillingStats:', error);
      res.status(500).json(ResponseFactory.createErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve statistics'));
    }
  }
}

export const tokenBillingValidationMiddleware = new TokenBillingValidationMiddleware();
