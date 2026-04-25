import { Request, Response } from 'express';
import { claimsServiceClient, ClaimSubmissionRequest } from '../clients/ClaimsServiceClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * Controller for hospital claims submission and tracking
 */
export const ClaimsController = {

  /**
   * Submit new claim for adjudication
   */
  async submitClaim(req: Request, res: Response) {
    try {
      const correlationId = req.correlationId;
      const providerId = req.auth?.providerId;

      logger.info('Processing claim submission', {
        correlationId,
        providerId
      });

      const claimRequest: ClaimSubmissionRequest = req.body;

      // ✅ DUPLICATE INVOICE NUMBER PREVENTION
      // Check for duplicate invoice number before proceeding
      const existingClaim = await claimsServiceClient.checkDuplicateInvoice(
        providerId,
        claimRequest.invoiceNumber,
        correlationId
      );

      if (existingClaim) {
        logger.warn('Rejected duplicate invoice number', {
          providerId,
          invoiceNumber: claimRequest.invoiceNumber,
          existingClaimId: existingClaim.claimId,
          correlationId
        });

        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_INVOICE',
            message: `Invoice number ${claimRequest.invoiceNumber} has already been submitted`,
            existingClaimId: existingClaim.claimId,
            submittedAt: existingClaim.createdAt
          },
          correlationId
        });
      }

      // Attach member verification data
      const memberVerification = req.memberVerification;
      if (memberVerification) {
        claimRequest.memberId = memberVerification.memberId || claimRequest.memberId;
      }
      claimRequest.submittingProviderId = providerId;

      const result = await claimsServiceClient.submitClaim(
        claimRequest,
        correlationId
      );

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Claim submitted successfully',
        correlationId
      });

    } catch (error) {
      logger.error('Claim submission failed', error as Error, {
        correlationId: req.correlationId
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit claim'
        },
        correlationId: (req as any).correlationId
      });
    }
  },

  /**
   * Get claim status
   */
  async getClaimStatus(req: Request, res: Response) {
    try {
      const correlationId = req.correlationId;
      const { claimId } = req.params;

      logger.info('Getting claim status', {
        claimId,
        correlationId
      });

      const status = await claimsServiceClient.getClaimStatus(
        claimId,
        correlationId
      );

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: 'Claim not found'
          },
          correlationId
        });
      }

      return res.json({
        success: true,
        data: status,
        message: 'Claim status retrieved successfully',
        correlationId
      });

    } catch (error) {
      logger.error('Failed to get claim status', error as Error, {
        correlationId: req.correlationId
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve claim status'
        },
        correlationId: (req as any).correlationId
      });
    }
  },

  /**
   * Get provider settlement summary dashboard
   */
  async getSettlementSummary(req: Request, res: Response) {
    try {
      const correlationId = req.correlationId;
      const providerId = Number(req.query.providerId);
      const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : undefined;
      const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : undefined;

      logger.info('Getting settlement summary', {
        providerId,
        periodStart,
        periodEnd,
        correlationId
      });

      const summary = await claimsServiceClient.getProviderSettlementSummary(
        providerId,
        periodStart,
        periodEnd,
        correlationId
      );

      return res.json({
        success: true,
        data: summary,
        message: 'Settlement summary retrieved successfully',
        correlationId
      });

    } catch (error) {
      logger.error('Failed to get settlement summary', error as Error, {
        correlationId: req.correlationId
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve settlement summary'
        },
        correlationId: (req as any).correlationId
      });
    }
  }
};