import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { schema } from '../models/schema.js';

const logger = createLogger('claim-validation');

// Claim validation schema
export const claimSchema = z.object({
  claimNumber: z.string().min(1, 'Claim number is required').max(50, 'Claim number is too long'),
  institutionId: z.number().positive('Institution ID must be a positive number'),
  memberId: z.number().positive('Member ID must be a positive number'),
  benefitId: z.number().positive('Benefit ID must be a positive number'),
  providerId: z.number({
    required_error: 'Provider ID is required. Every claim must be associated with a registered medical provider.'
  }).positive('Provider ID must be a valid positive number'),
  claimDate: z.date().optional(),
  serviceDate: z.date({
    required_error: 'Service date is a mandatory field. Please provide the date when the medical service was performed.'
  }),
  memberName: z.string().min(1, 'Member name is required').max(255, 'Member name is too long'),
  serviceType: z.string().min(1, 'Service type is required').max(100, 'Service type is too long'),
  totalAmount: z.number().positive('Total amount must be a positive number'),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description is too long'),
  diagnosis: z.string().min(1, 'Diagnosis is required').max(500, 'Diagnosis is too long'),
  diagnosisCode: z.string().min(3, 'Diagnosis code must be at least 3 characters').max(50, 'Diagnosis code is too long'),
  diagnosisCodeType: z.enum(['ICD-10', 'ICD-11'], {
    required_error: 'Diagnosis code type is required (ICD-10 or ICD-11)',
    invalid_type_error: 'Diagnosis code type must be either ICD-10 or ICD-11'
  }),
  treatmentDetails: z.string().optional(),
  status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed']).optional(),
  fraudRiskLevel: z.enum(['none', 'low', 'medium', 'high', 'confirmed']).optional()
});

// Middleware to validate claim data
export const validateClaim = (req: Request, res: Response, next: NextFunction) => {
  try {
    const claimData = req.body;
    const validatedClaim = claimSchema.parse(claimData);
    (req as any).validatedClaim = validatedClaim;
    return next();
  } catch (error) {
    logger.warn('Claim validation failed:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid claim data',
      errors: (error as any).errors
    });
  }
};

// Middleware to validate claim ID
export const validateClaimId = (req: Request, res: Response, next: NextFunction) => {
  const claimId = parseInt(req.params.claimId);
  if (isNaN(claimId) || claimId <= 0) {
    logger.warn('Invalid claim ID:', req.params.claimId);
    return res.status(400).json({
      success: false,
      message: 'Invalid claim ID'
    });
  }
  (req as any).claimId = claimId;
  return next();
};

/**
 * FR-09: Shift & Visit Window Rules Validation
 * Validates claim submission time against allowed working windows
 */
export const validateVisitWindowRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const claim = (req as any).validatedClaim;
    const visitDate = new Date(claim.serviceDate);
    const claimDate = new Date(claim.claimDate || new Date());
    
    // Business Rule 1: Claims must be submitted within 30 days of visit date
    const daysSinceVisit = Math.ceil((claimDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceVisit > 30) {
      return res.status(400).json({
        success: false,
        error: 'CLAIM_WINDOW_EXPIRED',
        message: `Claim must be submitted within 30 days of visit. This visit was ${daysSinceVisit} days ago.`
      });
    }

    // Business Rule 2: Claims cannot be backdated more than 90 days
    const daysBackdated = Math.ceil((new Date().getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysBackdated > 90) {
      return res.status(400).json({
        success: false,
        error: 'BACKDATE_LIMIT_EXCEEDED',
        message: `Claims cannot be backdated more than 90 days. Visit date is ${daysBackdated} days old.`
      });
    }

    // Business Rule 3: Weekend / After-hours validation
    const visitDay = visitDate.getDay();
    const visitHour = visitDate.getHours();
    const isWeekend = visitDay === 0 || visitDay === 6;
    const isAfterHours = visitHour < 8 || visitHour >= 18;

    if (isWeekend || isAfterHours) {
      // Mark for special review
      (req as any).requiresEscalation = true;
      (req as any).reviewReason = 'OUTSIDE_WORKING_HOURS';
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
