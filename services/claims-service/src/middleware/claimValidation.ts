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
