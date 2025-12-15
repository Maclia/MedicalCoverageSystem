import { differenceInYears, differenceInDays, isBefore } from "date-fns";

/**
 * Calculate age in years from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  return differenceInYears(new Date(), dob);
}

/**
 * Check if person is at least 18 years old
 */
export function isAdult(dateOfBirth: Date | string): boolean {
  return calculateAge(dateOfBirth) >= 18;
}

/**
 * Check if child is between 1 day and 18 years old
 */
export function isValidChildAge(dateOfBirth: Date | string): boolean {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  
  // Check if at least 1 day old
  const isAtLeastOneDay = differenceInDays(today, dob) >= 1;
  
  // Check if at most 18 years old
  const isAtMost18Years = calculateAge(dob) <= 18;
  
  // Check if date is not in the future
  const isNotFuture = isBefore(dob, today);
  
  return isAtLeastOneDay && isAtMost18Years && isNotFuture;
}

/**
 * Validate age based on dependent type
 */
export function validateDependentAge(
  dateOfBirth: Date | string, 
  dependentType: 'spouse' | 'child',
  hasDisability?: boolean
): { isValid: boolean; message?: string } {
  if (dependentType === 'spouse') {
    if (!isAdult(dateOfBirth)) {
      return { 
        isValid: false, 
        message: "Spouse must be at least 18 years old" 
      };
    }
  } else if (dependentType === 'child') {
    if (hasDisability) {
      // For special needs children, just check they're not in the future
      const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
      if (!isBefore(dob, new Date())) {
        return { 
          isValid: false, 
          message: "Date of birth cannot be in the future" 
        };
      }
    } else if (!isValidChildAge(dateOfBirth)) {
      const age = calculateAge(dateOfBirth);
      if (age > 18) {
        return {
          isValid: false,
          message: "Child must be 18 years or younger unless they have a disability"
        };
      } else {
        return {
          isValid: false,
          message: "Child must be at least 1 day old and not in the future"
        };
      }
    }
  }
  
  return { isValid: true };
}
