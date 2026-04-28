import { PremiumCalculationInput } from '../services/PremiumCalculationService.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates premium calculation input parameters
 * Follows strict validation rules according to business requirements
 */
export function validatePremiumCalculationInput(input: PremiumCalculationInput): ValidationResult {
  const errors: string[] = [];

  // Required fields validation
  if (!input.age || typeof input.age !== 'number') {
    errors.push('Age is required and must be a number');
  } else if (input.age < 0 || input.age > 120) {
    errors.push('Age must be between 0 and 120');
  }

  if (!input.gender || !['MALE', 'FEMALE'].includes(input.gender)) {
    errors.push('Gender is required and must be either MALE or FEMALE');
  }

  if (!input.regionCode || typeof input.regionCode !== 'string') {
    errors.push('Region code is required');
  }

  if (!input.coverLimit || typeof input.coverLimit !== 'number' || input.coverLimit <= 0) {
    errors.push('Cover limit is required and must be a positive number');
  }

  if (!input.coverType || typeof input.coverType !== 'string') {
    errors.push('Cover type is required');
  }

  if (!input.riskCode || typeof input.riskCode !== 'string') {
    errors.push('Risk code is required');
  }

  if (!input.lifestyleCode || typeof input.lifestyleCode !== 'string') {
    errors.push('Lifestyle code is required');
  }

  if (input.familySize === undefined || typeof input.familySize !== 'number') {
    errors.push('Family size is required and must be a number');
  } else if (input.familySize < 1 || input.familySize > 20) {
    errors.push('Family size must be between 1 and 20');
  }

  // Optional fields validation
  if (input.outpatientLimit !== undefined && (typeof input.outpatientLimit !== 'number' || input.outpatientLimit < 0)) {
    errors.push('Outpatient limit must be a positive number if provided');
  }

  if (input.schemeId !== undefined && typeof input.schemeId !== 'string') {
    errors.push('Scheme ID must be a string if provided');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}