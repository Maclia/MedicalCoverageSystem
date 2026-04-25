import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import {
  ResponseFactory,
  ErrorCodes,
  createBusinessRuleErrorResponse
} from '../utils/api-standardization.js';

const logger = createLogger();

export interface MemberVerificationResult {
  isValid: boolean;
  memberId?: number;
  membershipNumber?: string;
  status?: string;
  policyNumber?: string;
  coverageEffectiveDate?: Date;
  coverageExpiryDate?: Date;
  isInNetwork?: boolean;
  benefits?: {
    outpatient: boolean;
    inpatient: boolean;
    dental: boolean;
    optical: boolean;
  };
  error?: string;
}

export class MembershipServiceClient {
  private static instance: MembershipServiceClient;
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  private constructor() {
    this.baseUrl = config.services.membershipServiceUrl;
    this.apiKey = config.services.membershipServiceApiKey;
    this.timeout = 10000; // 10 seconds timeout
  }

  public static getInstance(): MembershipServiceClient {
    if (!MembershipServiceClient.instance) {
      MembershipServiceClient.instance = new MembershipServiceClient();
    }
    return MembershipServiceClient.instance;
  }

  async verifyMember(patientId: number, correlationId?: string): Promise<MemberVerificationResult> {
    try {
      logger.info('Verifying member status with membership service', {
        patientId,
        correlationId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/members/verify/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Correlation-ID': correlationId || '',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('Member not found in membership service', { patientId, correlationId });
          return {
            isValid: false,
            error: 'MEMBER_NOT_FOUND'
          };
        }

        logger.error('Membership service verification failed', undefined, {
          patientId: patientId,
          status: response.status,
          correlationId
        });

        return {
          isValid: false,
          error: 'SERVICE_UNAVAILABLE'
        };
      }

      const result = await response.json();

      logger.info('Member verification completed', {
        patientId,
        isValid: result.data?.isActive,
        status: result.data?.status,
        correlationId
      });

      return {
        isValid: result.data?.isActive === true,
        memberId: result.data?.id,
        membershipNumber: result.data?.membershipNumber,
        status: result.data?.status,
        policyNumber: result.data?.policyNumber,
        coverageEffectiveDate: result.data?.coverageEffectiveDate,
        coverageExpiryDate: result.data?.coverageExpiryDate,
        isInNetwork: result.data?.isInNetwork,
        benefits: result.data?.benefits
      };

    } catch (err) {
      logger.error('Failed to verify member status', err instanceof Error ? err : undefined, {
        patientId,
        correlationId
      });

      // Fail closed - if we can't verify, don't allow appointment
      return {
        isValid: false,
        error: 'VERIFICATION_FAILED'
      };
    }
  }

  async getMemberEligibility(patientId: number, appointmentType: string, facilityId?: number, correlationId?: string): Promise<{
    eligible: boolean;
    requiresPreAuthorization: boolean;
    coveragePercentage: number;
    reason?: string;
  }> {
    try {
      logger.info('Checking member eligibility for appointment', {
        patientId,
        appointmentType,
        facilityId,
        correlationId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/members/${patientId}/eligibility`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Correlation-ID': correlationId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentType,
          facilityId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          eligible: false,
          requiresPreAuthorization: true,
          coveragePercentage: 0,
          reason: 'Eligibility check failed'
        };
      }

      const result = await response.json();

      return result.data || {
        eligible: false,
        requiresPreAuthorization: true,
        coveragePercentage: 0
      };

    } catch (err) {
      logger.error('Failed to check member eligibility', err instanceof Error ? err : undefined, {
        patientId,
        correlationId
      });

      return {
        eligible: false,
        requiresPreAuthorization: true,
        coveragePercentage: 0
      };
    }
  }

  createVerificationErrorResponse(error: string, correlationId?: string) {
    const errorMap: Record<string, { code: string; message: string }> = {
      'MEMBER_NOT_FOUND': {
        code: 'MEMBER_NOT_REGISTERED',
        message: 'Patient is not a registered member. Please verify membership before booking.'
      },
      'SERVICE_UNAVAILABLE': {
        code: 'VERIFICATION_SERVICE_DOWN',
        message: 'Membership verification service is currently unavailable. Please try again later.'
      },
      'VERIFICATION_FAILED': {
        code: 'VERIFICATION_FAILED',
        message: 'Could not verify member status. Please contact support.'
      }
    };

    const errorInfo = errorMap[error] || errorMap['VERIFICATION_FAILED'];

    return createBusinessRuleErrorResponse(
      errorInfo.code,
      errorInfo.message,
      undefined,
      correlationId
    );
  }
}

export const membershipServiceClient = MembershipServiceClient.getInstance();