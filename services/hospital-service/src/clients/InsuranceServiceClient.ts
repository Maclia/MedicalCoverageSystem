import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface BenefitLimit {
  benefitCode: string;
  benefitName: string;
  category: string;
  totalLimit: number;
  usedAmount: number;
  remainingAmount: number;
  coveragePercentage: number;
  coPayment: number;
  isCovered: boolean;
  policyLevel: string;
  expiryDate?: Date;
}

export interface BenefitCheckResult {
  eligible: boolean;
  memberId: number;
  policyNumber: string;
  procedureCode?: string;
  procedureDescription?: string;
  requestedAmount: number;
  coveredAmount: number;
  patientPayableAmount: number;
  coPaymentAmount: number;
  deductibleAmount: number;
  requiresPreAuthorization: boolean;
  preAuthorizationThreshold: number;
  benefitLimits: BenefitLimit[];
  validUntil?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface PreAuthorizationRequest {
  memberId: number;
  patientId: number;
  providerId: number;
  facilityId: number;
  procedureCode: string;
  procedureDescription: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  requestedAmount: number;
  consultationDate: Date;
  admissionDate?: Date;
  dischargeDate?: Date;
  visitType: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'DAY_CARE';
  attendingDoctor: string;
  notes?: string;
  supportingDocuments?: string[];
}

export interface PreAuthorizationResponse {
  preAuthId: string;
  status: 'APPROVED' | 'PENDING' | 'DECLINED' | 'REQUIRES_REVIEW';
  referenceNumber: string;
  approvedAmount: number;
  validFrom: Date;
  validTo: Date;
  requiresAdditionalDocuments?: string[];
  reviewComments?: string;
  declineReason?: string;
}

export class InsuranceServiceClient {
  private static instance: InsuranceServiceClient;
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  private constructor() {
    this.baseUrl = config.services.insuranceServiceUrl;
    this.apiKey = config.services.insuranceServiceApiKey || '';
    this.timeout = 15000; // 15 seconds timeout
  }

  public static getInstance(): InsuranceServiceClient {
    if (!InsuranceServiceClient.instance) {
      InsuranceServiceClient.instance = new InsuranceServiceClient();
    }
    return InsuranceServiceClient.instance;
  }

  async checkBenefitEligibility(
    memberId: number,
    procedureCode: string,
    requestedAmount: number,
    facilityId?: number,
    correlationId?: string
  ): Promise<BenefitCheckResult> {
    try {
      logger.info('Checking benefit eligibility', {
        memberId,
        procedureCode,
        requestedAmount,
        facilityId,
        correlationId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/benefits/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Correlation-ID': correlationId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberId,
          procedureCode,
          requestedAmount,
          facilityId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.warn('Benefit check failed', {
          memberId,
          status: response.status,
          error: error.message,
          correlationId
        });

        return {
          eligible: false,
          memberId,
          policyNumber: '',
          requestedAmount,
          coveredAmount: 0,
          patientPayableAmount: requestedAmount,
          coPaymentAmount: 0,
          deductibleAmount: 0,
          requiresPreAuthorization: true,
          preAuthorizationThreshold: 0,
          benefitLimits: [],
          errorCode: `HTTP_${response.status}`,
          errorMessage: 'Benefit verification service unavailable'
        };
      }

      const result = await response.json();
      
      logger.info('Benefit check completed', {
        memberId,
        eligible: result.data?.eligible,
        coveredAmount: result.data?.coveredAmount,
        correlationId
      });

      return result.data;

    } catch (error) {
      logger.error('Benefit check exception', error as Error, {
        memberId,
        correlationId
      });

      return {
        eligible: false,
        memberId,
        policyNumber: '',
        requestedAmount,
        coveredAmount: 0,
        patientPayableAmount: requestedAmount,
        coPaymentAmount: 0,
        deductibleAmount: 0,
        requiresPreAuthorization: true,
        preAuthorizationThreshold: 0,
        benefitLimits: [],
        errorCode: 'CONNECTION_FAILED',
        errorMessage: 'Could not connect to insurance service'
      };
    }
  }

  async getMemberBenefits(
    memberId: number,
    correlationId?: string
  ): Promise<BenefitLimit[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/benefits/member/${memberId}`, {
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
        return [];
      }

      const result = await response.json();
      return result.data || [];

    } catch {
      return [];
    }
  }

  async submitPreAuthorization(
    request: PreAuthorizationRequest,
    correlationId?: string
  ): Promise<PreAuthorizationResponse> {
    try {
      logger.info('Submitting pre-authorization request', {
        memberId: request.memberId,
        procedureCode: request.procedureCode,
        requestedAmount: request.requestedAmount,
        correlationId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/preauthorizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Correlation-ID': correlationId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      logger.info('Pre-authorization response received', {
        preAuthId: result.data?.preAuthId,
        status: result.data?.status,
        correlationId
      });

      return result.data;

    } catch (error) {
      logger.error('Pre-authorization submission failed', error as Error, {
        memberId: request.memberId,
        correlationId
      });

      return {
        preAuthId: '',
        status: 'PENDING',
        referenceNumber: '',
        approvedAmount: 0,
        validFrom: new Date(),
        validTo: new Date()
      };
    }
  }

  async getPreAuthorizationStatus(
    preAuthId: string,
    correlationId?: string
  ): Promise<PreAuthorizationResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/preauthorizations/${preAuthId}`, {
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
        return null;
      }

      const result = await response.json();
      return result.data;

    } catch {
      return null;
    }
  }
}

export const insuranceServiceClient = InsuranceServiceClient.getInstance();