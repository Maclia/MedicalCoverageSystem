import { Request, Response } from 'express';
import { insuranceServiceClient, PreAuthorizationRequest } from '../clients/InsuranceServiceClient.js';
import { createLogger } from '../utils/logger.js';
import { ResponseFactory } from '../utils/api-standardization.js';

const logger = createLogger();

/**
 * Controller for hospital pre-authorization workflows
 */
export const PreAuthorizationController = {

  /**
   * Submit new pre-authorization request
   */
  async submitPreAuthorization(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;

      logger.info('Processing pre-authorization submission request', {
        correlationId
      });

      const requestData: PreAuthorizationRequest = req.body;

      // Get member verification data if available
      const memberVerification = (req as any).memberVerification;
      if (memberVerification) {
        requestData.memberId = memberVerification.memberId || requestData.memberId;
      }

      const result = await insuranceServiceClient.submitPreAuthorization(
        requestData,
        correlationId
      );

      return res.status(201).json(ResponseFactory.createSuccessResponse(
        result,
        undefined,
        correlationId
      ));

    } catch (error) {
      logger.error('Pre-authorization submission failed', error as Error, {
        correlationId: (req as any).correlationId
      });

      return res.status(500).json(ResponseFactory.createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to submit pre-authorization request',
        undefined,
        (req as any).correlationId
      ));
    }
  },

  /**
   * Get pre-authorization status
   */
  async getPreAuthorizationStatus(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;
      const { preAuthId } = req.params;

      logger.info('Getting pre-authorization status', {
        preAuthId,
        correlationId
      });

      const status = await insuranceServiceClient.getPreAuthorizationStatus(
        preAuthId,
        correlationId
      );

      if (!status) {
        return res.status(404).json(ResponseFactory.createErrorResponse(
          'PREAUTH_NOT_FOUND',
          'Pre-authorization request not found',
          undefined,
          correlationId
        ));
      }

      return res.json(ResponseFactory.createSuccessResponse(
        status,
        undefined,
        correlationId
      ));

    } catch (error) {
      logger.error('Failed to get pre-authorization status', error as Error, {
        correlationId: (req as any).correlationId
      });

      return res.status(500).json(ResponseFactory.createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve pre-authorization status',
        undefined,
        (req as any).correlationId
      ));
    }
  },

  /**
   * Check benefit eligibility for procedure
   */
  async checkBenefitEligibility(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;
      const { memberId, procedureCode, requestedAmount, facilityId } = req.body;

      logger.info('Checking benefit eligibility', {
        memberId,
        procedureCode,
        requestedAmount,
        correlationId
      });

      const result = await insuranceServiceClient.checkBenefitEligibility(
        memberId,
        procedureCode,
        requestedAmount,
        facilityId,
        correlationId
      );

      return res.json(ResponseFactory.createSuccessResponse(
        result,
        undefined,
        correlationId
      ));

    } catch (error) {
      logger.error('Benefit eligibility check failed', error as Error, {
        correlationId: (req as any).correlationId
      });

      return res.status(500).json(ResponseFactory.createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to check benefit eligibility',
        undefined,
        (req as any).correlationId
      ));
    }
  },

  /**
   * Get full member benefit breakdown
   */
  async getMemberBenefits(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;
      const { memberId } = req.params;

      logger.info('Getting member benefits', {
        memberId,
        correlationId
      });

      const benefits = await insuranceServiceClient.getMemberBenefits(
        Number(memberId),
        correlationId
      );

      return res.json(ResponseFactory.createSuccessResponse(
        benefits,
        undefined,
        correlationId
      ));

    } catch (error) {
      logger.error('Failed to get member benefits', error as Error, {
        correlationId: (req as any).correlationId
      });

      return res.status(500).json(ResponseFactory.createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve member benefits',
        undefined,
        (req as any).correlationId
      ));
    }
  }
};