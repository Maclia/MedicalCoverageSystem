import { Request, Response, NextFunction } from 'express';
import { membershipServiceClient } from '../clients/MembershipServiceClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * Middleware to verify that a patient is a valid registered member
 * This runs before appointment booking and patient operations
 */
export const memberVerificationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract patient ID from request
    let patientId: number | null = null;

    // Check in body first (for POST/PUT requests)
    if (req.body && req.body.patientId) {
      patientId = Number(req.body.patientId);
    }
    // Check in params (for patient-specific routes)
    else if (req.params && req.params.id) {
      patientId = Number(req.params.id);
    }
    // Check in query params
    else if (req.query && req.query.patientId) {
      patientId = Number(req.query.patientId as string);
    }

    // Skip verification if no patient ID found (route doesn't require it)
    if (!patientId || isNaN(patientId) || patientId <= 0) {
      return next();
    }

    // Skip verification for emergency appointments
    if (req.body && req.body.isEmergency === true) {
      logger.info('Skipping member verification for emergency appointment', {
        patientId,
        correlationId: req.correlationId
      });
      return next();
    }

    logger.info('Running member verification', {
      patientId,
      path: req.path,
      method: req.method,
      correlationId: req.correlationId
    });

    // Verify member status
    const verificationResult = await membershipServiceClient.verifyMember(
      patientId,
      req.correlationId
    );

    if (!verificationResult.isValid) {
      logger.warn('Member verification failed', {
        patientId,
        error: verificationResult.error,
        correlationId: req.correlationId
      });

      const errorResponse = membershipServiceClient.createVerificationErrorResponse(
        verificationResult.error || 'VERIFICATION_FAILED',
        req.correlationId
      );

      return res.status(403).json(errorResponse);
    }

    // Attach member information to request for downstream use
    (req as any).memberVerification = verificationResult;

    logger.info('Member verification successful', {
      patientId,
      memberId: verificationResult.memberId,
      status: verificationResult.status,
      correlationId: req.correlationId
    });

    next();

  } catch (error) {
    logger.error('Member verification middleware error', error as Error, {
      correlationId: req.correlationId
    });

    // Fail closed - don't allow operation if verification fails
    return res.status(503).json({
      success: false,
      error: {
        code: 'VERIFICATION_SERVICE_UNAVAILABLE',
        message: 'Member verification service is currently unavailable. Please try again later.'
      },
      correlationId: req.correlationId
    });
  }
};

/**
 * Optional middleware that only logs verification status but doesn't block
 * Use for read-only operations where verification is not strictly required
 */
export const memberVerificationLoggingMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let patientId: number | null = null;

    if (req.query && req.query.patientId) {
      patientId = Number(req.query.patientId as string);
    }

    if (patientId && !isNaN(patientId) && patientId > 0) {
      // Run verification in background without blocking
      membershipServiceClient.verifyMember(patientId, req.correlationId)
        .then(result => {
          if (!result.isValid) {
            logger.warn('Access by unverified member', {
              patientId,
              path: req.path,
              correlationId: req.correlationId
            });
          }
        })
        .catch(() => {
          // Silent failure for logging only
        });
    }

    next();

  } catch {
    // Never block request for logging middleware
    next();
  }
};