import { Request, Response } from 'express';
import { ClaimsService } from '../services/ClaimsService.js';
import { CoreServiceClient } from '../clients/CoreServiceClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('claims-controller');

/**
 * Claims Controller
 * 
 * HTTP Request handlers for claims endpoints
 * Follows standard controller pattern used across all services
 * Converts HTTP requests to service layer calls
 * Handles response formatting and status codes
 */
export class ClaimsController {

  /**
   * Get paginated list of claims with filtering
   * GET /claims
   */
  static async getClaims(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = req.query.filters || {};
      
      const result = await ClaimsService.getClaims(page, limit, filters);
      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch claims' });
    }
  }

  /**
   * Get single claim by ID
   * GET /claims/:id
   */
  static async getClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const claim = await ClaimsService.getClaimById(claimId);
      
      if (!claim) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      
      return res.json({ success: true, data: claim });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch claim' });
    }
  }

  /**
   * Create new claim
   * POST /claims
   */
  static async createClaim(req: Request, res: Response) {
    try {
      const claimData = (req as any).validatedClaim;
      
      // ✅ FIRST: Duplicate Claim Detection - Prevents #1 Fraud Pattern
      const duplicateCheck = await ClaimsService.detectDuplicateClaim(claimData);

      if (duplicateCheck.isDuplicate) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate claim detected',
          message: duplicateCheck.error,
          existingClaimId: duplicateCheck.existingClaimId
        });
      }

      // ✅ SECOND: Verify Provider Authorization - Critical Fraud Prevention Check
      const providerAuth = await ClaimsService.verifyProviderAuthorization(
        claimData.providerId,
        claimData.benefitId
      );

      if (!providerAuth.authorized) {
        return res.status(400).json({
          success: false,
          error: 'Provider authorization verification failed',
          message: providerAuth.error
        });
      }

      // Verify member eligibility next
      const eligibility = await ClaimsService.verifyMemberEligibility(
        claimData.memberId,
        new Date(claimData.serviceDate)
      );

      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          error: 'Member eligibility verification failed',
          message: eligibility.error
        });
      }

      // Check member benefit balance before processing claim
      const balanceCheck = await ClaimsService.checkBenefitBalance(
        claimData.memberId,
        claimData.benefitId,
        claimData.amount
      );

      // ✅ CENTRALIZED BUSINESS RULES VALIDATION (Core Service)
      const businessRuleResult = await CoreServiceClient.validateClaimWithBusinessRules(claimData);

      if (!businessRuleResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Business policy validation failed',
          message: businessRuleResult.error,
          rule: businessRuleResult.rule,
          metadata: businessRuleResult.metadata
        });
      }

      if (!balanceCheck.available) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient benefit balance',
          message: 'Your current benefit balance is insufficient for this claim amount.',
          guidance: 'You may either:\n1. Choose a different billing method for this service\n2. Upgrade your benefit plan\n3. Pay the remaining amount out-of-pocket',
          balance: {
            remaining: balanceCheck.remainingBalance,
            requested: claimData.amount,
            limit: balanceCheck.limitAmount,
            deficit: claimData.amount - balanceCheck.remainingBalance
          }
        });
      }

      const claim = await ClaimsService.createClaim(claimData);
      return res.status(201).json({ 
        success: true, 
        data: claim,
        balance: {
          remaining: balanceCheck.remainingBalance - claimData.amount,
          previous: balanceCheck.remainingBalance
        }
      });
    } catch (error) {
      logger.error('Error creating claim:', error);
      return res.status(500).json({ success: false, error: 'Failed to create claim' });
    }
  }

  /**
   * Update existing claim
   * PUT /claims/:id
   */
  static async updateClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const { status, notes, ...updateData } = req.body;
      
      // For full claim updates we use status update method with all fields
      const claim = await ClaimsService.updateClaimStatus(claimId, status || 'UPDATED', notes);
      
      if (!claim) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      
      return res.json({ success: true, data: claim });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to update claim' });
    }
  }

  /**
   * Delete claim
   * DELETE /claims/:id
   */
  static async deleteClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const deleted = await ClaimsService.deleteClaim(claimId);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      
      return res.json({ success: true, message: 'Claim deleted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to delete claim' });
    }
  }

  /**
   * Update claim status
   * PATCH /claims/:id/status
   */
  static async updateClaimStatus(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const claim = await ClaimsService.updateClaimStatus(claimId, status, notes);
      
      if (!claim) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      
      return res.json({ success: true, data: claim });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to update claim status' });
    }
  }

  /**
   * Submit claim for processing
   * POST /claims/:id/submit
   */
  static async submitClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const claim = await ClaimsService.updateClaimStatus(claimId, 'SUBMITTED', 'Claim submitted by user');
      
      return res.json({ success: true, data: claim, message: 'Claim submitted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to submit claim' });
    }
  }

  /**
   * Approve claim
   * POST /claims/:id/approve
   */
  static async approveClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const claim = await ClaimsService.updateClaimStatus(claimId, 'APPROVED', notes);
      
      return res.json({ success: true, data: claim, message: 'Claim approved successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to approve claim' });
    }
  }

  /**
   * Deny claim
   * POST /claims/:id/deny
   */
  static async denyClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const claim = await ClaimsService.updateClaimStatus(claimId, 'DENIED', notes);
      
      return res.json({ success: true, data: claim, message: 'Claim denied successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to deny claim' });
    }
  }

  /**
   * Get claim statistics summary
   * GET /stats/summary
   */
  static async getClaimStats(req: Request, res: Response) {
    try {
      // TODO: Implement statistics service method
      return res.json({
        success: true,
        data: {
          total: 0,
          pending: 0,
          approved: 0,
          denied: 0,
          totalValue: 0
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch claim statistics' });
    }
  }

  /**
   * Get claim trends data
   * GET /stats/trends
   */
  static async getClaimTrends(req: Request, res: Response) {
    try {
      // TODO: Implement trends service method
      return res.json({
        success: true,
        data: {
          period: 'last_30_days',
          trends: []
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch claim trends' });
    }
  }
}