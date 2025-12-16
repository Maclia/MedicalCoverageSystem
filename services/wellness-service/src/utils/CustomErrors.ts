/**
 * Custom error classes for Wellness Service
 * Provides domain-specific error handling with health and wellness compliance features
 */

export class WellnessError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'WELLNESS_ERROR',
    healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none'
  ) {
    super(message);
    this.name = 'WellnessError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.healthImpact = healthImpact;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends WellnessError {
  constructor(message: string, field?: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(message, 400, 'VALIDATION_ERROR', healthImpact);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends WellnessError {
  constructor(resource: string = 'Resource', healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`${resource} not found`, 404, 'NOT_FOUND', healthImpact);
    this.name = 'NotFoundError';
  }
}

export class DuplicateResourceError extends WellnessError {
  constructor(resource: string, field: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`${resource} with this ${field} already exists`, 409, 'DUPLICATE_RESOURCE', healthImpact);
    this.name = 'DuplicateResourceError';
  }
}

export class BusinessRuleError extends WellnessError {
  constructor(message: string, rule?: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', healthImpact);
    this.name = 'BusinessRuleError';
  }
}

export class AuthenticationError extends WellnessError {
  constructor(message: string = 'Authentication required', healthImpact: 'high' | 'critical' = 'high') {
    super(message, 401, 'AUTHENTICATION_ERROR', healthImpact);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends WellnessError {
  constructor(message: string = 'Access denied', healthImpact: 'medium' | 'high' | 'critical' = 'medium') {
    super(message, 403, 'AUTHORIZATION_ERROR', healthImpact);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends WellnessError {
  constructor(message: string = 'Rate limit exceeded', healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', healthImpact);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends WellnessError {
  constructor(service: string, message: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`External service ${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', healthImpact);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends WellnessError {
  constructor(message: string, operation?: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Database error${operation ? ` during ${operation}` : ''}: ${message}`, 500, 'DATABASE_ERROR', healthImpact);
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends WellnessError {
  constructor(message: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Configuration error: ${message}`, 500, 'CONFIGURATION_ERROR', healthImpact);
    this.name = 'ConfigurationError';
  }
}

// Wellness Program-specific errors
export class ProgramNotFoundError extends NotFoundError {
  constructor(programId: number, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Wellness program with ID ${programId}`, healthImpact);
    this.name = 'ProgramNotFoundError';
  }
}

export class ProgramStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} wellness program with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'PROGRAM_STATUS_ERROR', 'medium');
    this.name = 'ProgramStatusError';
  }
}

export class ProgramCapacityError extends BusinessRuleError {
  constructor(programId: number, currentParticipants: number, maxParticipants: number) {
    super(`Program capacity reached for program ${programId}. Current: ${currentParticipants}, Max: ${maxParticipants}`, 'PROGRAM_CAPACITY_ERROR', 'low');
    this.name = 'ProgramCapacityError';
  }
}

export class ProgramEligibilityError extends ValidationError {
  constructor(message: string, requirements: any[], healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Program eligibility error: ${message}. Requirements: ${requirements.join(', ')}`, 'eligibility', healthImpact);
    this.name = 'ProgramEligibilityError';
  }
}

// Activity-specific errors
export class ActivityNotFoundError extends NotFoundError {
  constructor(activityId: number, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Wellness activity with ID ${activityId}`, healthImpact);
    this.name = 'ActivityNotFoundError';
  }
}

export class ActivitySafetyError extends BusinessRuleError {
  constructor(message: string, safetyLevel: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'high') {
    super(`Activity safety error (${safetyLevel}): ${message}`, 'ACTIVITY_SAFETY_ERROR', healthImpact);
    this.name = 'ActivitySafetyError';
  }
}

export class ActivityIncompatibilityError extends BusinessRuleError {
  constructor(message: string, conditions: string[], healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Activity incompatibility error: ${message}. Contraindications: ${conditions.join(', ')}`, 'ACTIVITY_INCOMPATIBILITY_ERROR', healthImpact);
    this.name = 'ActivityIncompatibilityError';
  }
}

// Health Metrics-specific errors
export class HealthMetricValidationError extends ValidationError {
  constructor(message: string, metricType: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Health metric validation error for ${metricType}: ${message}`, 'health_metric', healthImpact);
    this.name = 'HealthMetricValidationError';
  }
}

export class HealthMetricRangeError extends ValidationError {
  constructor(metricType: string, value: number, minValue: number, maxValue: number, healthImpact: 'medium' | 'high' | 'critical' = 'medium') {
    super(`Health metric out of range for ${metricType}: ${value}. Valid range: ${minValue}-${maxValue}`, 'metric_range', healthImpact);
    this.name = 'HealthMetricRangeError';
  }
}

export class CriticalHealthAlertError extends WellnessError {
  constructor(metricType: string, value: number, threshold: number, userId: number, healthImpact: 'high' | 'critical' = 'critical') {
    super(`Critical health alert: ${metricType} value ${value} exceeds threshold ${threshold} for user ${userId}`, 400, 'CRITICAL_HEALTH_ALERT', healthImpact);
    this.name = 'CriticalHealthAlertError';
  }
}

// Goal-specific errors
export class GoalNotFoundError extends NotFoundError {
  constructor(goalId: number, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Wellness goal with ID ${goalId}`, healthImpact);
    this.name = 'GoalNotFoundError';
  }
}

export class GoalStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} wellness goal with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'GOAL_STATUS_ERROR', 'low');
    this.name = 'GoalStatusError';
  }
}

export class UnachievableGoalError extends BusinessRuleError {
  constructor(goalType: string, targetValue: number, realisticValue: number, timeframe: string) {
    super(`Unachievable goal: ${goalType} target ${targetValue} is unrealistic. Recommended: ${realisticValue} within ${timeframe}`, 'UNACHIEVABLE_GOAL', 'medium');
    this.name = 'UnachievableGoalError';
  }
}

// Challenge-specific errors
export class ChallengeNotFoundError extends NotFoundError {
  constructor(challengeId: number, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Wellness challenge with ID ${challengeId}`, healthImpact);
    this.name = 'ChallengeNotFoundError';
  }
}

export class ChallengeStatusError extends BusinessRuleError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(`Cannot ${action} wellness challenge with status '${currentStatus}'. Required status: '${requiredStatus}'`, 'CHALLENGE_STATUS_ERROR', 'low');
    this.name = 'ChallengeStatusError';
  }
}

export class ChallengeParticipationError extends ValidationError {
  constructor(message: string, challengeRules: any[], healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Challenge participation error: ${message}. Rules: ${challengeRules.join(', ')}`, 'participation', healthImpact);
    this.name = 'ChallengeParticipationError';
  }
}

// Reward and Achievement-specific errors
export class RewardNotFoundError extends NotFoundError {
  constructor(rewardId: number, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super(`Wellness reward with ID ${rewardId}`, healthImpact);
    this.name = 'RewardNotFoundError';
  }
}

export class DuplicateRewardError extends DuplicateResourceError {
  constructor(rewardType: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low') {
    super('Reward', rewardType, healthImpact);
    this.name = 'DuplicateRewardError';
  }
}

export class AchievementLockError extends BusinessRuleError {
  constructor(achievementId: string, unlockCondition: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Achievement locked: ${achievementId}. Unlock condition: ${unlockCondition}`, 'ACHIEVEMENT_LOCK_ERROR', healthImpact);
    this.name = 'AchievementLockError';
  }
}

// Device Integration-specific errors
export class DeviceIntegrationError extends ExternalServiceError {
  constructor(deviceType: string, message: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`${deviceType}`, message, healthImpact);
    this.name = 'DeviceIntegrationError';
  }
}

export class DeviceSyncError extends ExternalServiceError {
  constructor(deviceType: string, message: string, syncData?: any, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Device Sync ${deviceType}`, message, healthImpact);
    this.name = 'DeviceSyncError';
  }
}

export class DeviceDataValidationError extends ValidationError {
  constructor(message: string, deviceType: string, dataType: string, healthImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(`Device data validation error: ${message} (Device: ${deviceType}, Data: ${dataType})`, 'device_data', healthImpact);
    this.name = 'DeviceDataValidationError';
  }
}

// Data Privacy and Compliance errors
export class DataPrivacyError extends BusinessRuleError {
  constructor(message: string, privacyType: string, userId: number, healthImpact: 'high' | 'critical' = 'high') {
    super(`Data privacy violation (${privacyType}): ${message} for user ${userId}`, 'DATA_PRIVACY_VIOLATION', healthImpact);
    this.name = 'DataPrivacyError';
  }
}

export class ConsentRequiredError extends ValidationError {
  constructor(consentType: string, userId: number, healthImpact: 'high' | 'critical' = 'high') {
    super(`Consent required for ${consentType} operations for user ${userId}`, 'consent_required', healthImpact);
    this.name = 'ConsentRequiredError';
  }
}

export class HealthDataAccessError extends AuthorizationError {
  constructor(message: string, dataType: string, requestorId: number, ownerId: number, healthImpact: 'high' | 'critical' = 'critical') {
    super(`Unauthorized health data access: ${message}. Data: ${dataType}, Requestor: ${requestorId}, Owner: ${ownerId}`, healthImpact);
    this.name = 'HealthDataAccessError';
  }
}

// Medical Safety-specific errors
export class MedicalSafetyError extends WellnessError {
  constructor(message: string, riskLevel: string, medicalCondition?: string, healthImpact: 'high' | 'critical' = 'critical') {
    super(`Medical safety error (${riskLevel}): ${message}`, 400, 'MEDICAL_SAFETY_ERROR', healthImpact);
    this.name = 'MedicalSafetyError';
  }
}

export class MedicalContraidicationError extends BusinessRuleError {
  constructor(activityType: string, contraindication: string, medicalCondition?: string, healthImpact: 'high' | 'critical' = 'critical') {
    super(`Medical contraindication: ${activityType} not recommended for ${contraindication}${medicalCondition ? ` (${medicalCondition})` : ''}`, 'MEDICAL_CONTRAINDICATION', healthImpact);
    this.name = 'MedicalContraidicationError';
  }
}

// Utility functions
export function isOperationalError(error: Error): boolean {
  if (error instanceof WellnessError) {
    return error.isOperational;
  }
  return false;
}

export function getHealthImpact(error: Error): string {
  if (error instanceof WellnessError) {
    return error.healthImpact;
  }
  return 'none';
}

export function requiresMedicalAttention(error: Error): boolean {
  if (error instanceof WellnessError) {
    return error.healthImpact === 'high' || error.healthImpact === 'critical';
  }
  return false;
}

export function createErrorFromCode(errorCode: string, message?: string, healthImpact?: string): WellnessError {
  const errorMap: Record<string, typeof WellnessError> = {
    VALIDATION_ERROR: ValidationError,
    NOT_FOUND: NotFoundError,
    DUPLICATE_RESOURCE: DuplicateResourceError,
    BUSINESS_RULE_VIOLATION: BusinessRuleError,
    AUTHENTICATION_ERROR: AuthenticationError,
    AUTHORIZATION_ERROR: AuthorizationError,
    RATE_LIMIT_EXCEEDED: RateLimitError,
    DATABASE_ERROR: DatabaseError,
    CONFIGURATION_ERROR: ConfigurationError,
    PROGRAM_STATUS_ERROR: ProgramStatusError,
    ACTIVITY_SAFETY_ERROR: ActivitySafetyError,
    HEALTH_METRIC_VALIDATION_ERROR: HealthMetricValidationError,
    CRITICAL_HEALTH_ALERT: CriticalHealthAlertError,
    DATA_PRIVACY_VIOLATION: DataPrivacyError,
    MEDICAL_SAFETY_ERROR: MedicalSafetyError,
  };

  const ErrorClass = errorMap[errorCode] || WellnessError;
  return new ErrorClass(message || `Error: ${errorCode}`, 500, errorCode);
}

export default {
  WellnessError,
  ValidationError,
  NotFoundError,
  DuplicateResourceError,
  BusinessRuleError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  // Program errors
  ProgramNotFoundError,
  ProgramStatusError,
  ProgramCapacityError,
  ProgramEligibilityError,
  // Activity errors
  ActivityNotFoundError,
  ActivitySafetyError,
  ActivityIncompatibilityError,
  // Health metric errors
  HealthMetricValidationError,
  HealthMetricRangeError,
  CriticalHealthAlertError,
  // Goal errors
  GoalNotFoundError,
  GoalStatusError,
  UnachievableGoalError,
  // Challenge errors
  ChallengeNotFoundError,
  ChallengeStatusError,
  ChallengeParticipationError,
  // Reward errors
  RewardNotFoundError,
  DuplicateRewardError,
  AchievementLockError,
  // Device errors
  DeviceIntegrationError,
  DeviceSyncError,
  DeviceDataValidationError,
  // Privacy errors
  DataPrivacyError,
  ConsentRequiredError,
  HealthDataAccessError,
  // Medical safety errors
  MedicalSafetyError,
  MedicalContraidicationError,
  isOperationalError,
  getHealthImpact,
  requiresMedicalAttention,
  createErrorFromCode
};