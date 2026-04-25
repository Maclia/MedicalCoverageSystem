import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface ClaimItem {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  benefitCode?: string;
}

export interface ClaimSubmissionRequest {
  preAuthorizationId?: string;
  memberId: number;
  patientId: number;
  providerId: number;
  invoiceNumber: string;
  submittingProviderId?: number;
  facilityId: number;
  visitDate: Date;
  dischargeDate?: Date;
  visitType: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'DAY_CARE';
  diagnosisCodes: string[];
  procedureCodes: string[];
  attendingDoctor: string;
  referralDoctor?: string;
  roomType?: string;
  totalClaimAmount: number;
  items: ClaimItem[];
  notes?: string;
  supportingDocuments?: string[];
}

export interface ClaimSubmissionResponse {
  claimId: string;
  claimNumber: string;
  status: 'SUBMITTED' | 'PENDING_ADJUDICATION' | 'FLAGGED';
  receivedAt: Date;
  adjudicationPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  estimatedProcessingTime: string;
  riskScore?: number;
  fraudIndicators?: string[];
}

export interface ClaimStatusResponse {
  claimId: string;
  claimNumber: string;
  status: string;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    actor: string;
    notes?: string;
  }>;
  totalRequestedAmount: number;
  approvedAmount: number;
  declinedAmount: number;
  patientPayableAmount: number;
  settlementDate?: Date;
  paymentReference?: string;
  adjudicationNotes?: string;
}

export interface SettlementSummary {
  totalClaims: number;
  totalSubmittedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  pendingAmount: number;
  averageProcessingTimeDays: number;
  pendingClaims: number;
  approvedClaims: number;
  declinedClaims: number;
  paidClaims: number;
}

export class ClaimsServiceClient {
  private static instance: ClaimsServiceClient;
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  private constructor() {
    this.baseUrl = config.services.claimsServiceUrl;
    this.apiKey = config.services.claimsServiceApiKey || '';
    this.timeout = 15000; // 15 seconds timeout
  }

  public static getInstance(): ClaimsServiceClient {
    if (!ClaimsServiceClient.instance) {
      ClaimsServiceClient.instance = new ClaimsServiceClient();
    }
    return ClaimsServiceClient.instance;
  }

  async submitClaim(
    request: ClaimSubmissionRequest,
    correlationId?: string
  ): Promise<ClaimSubmissionResponse> {
    try {
      logger.info('Submitting claim to claims service', {
        memberId: request.memberId,
        totalAmount: request.totalClaimAmount,
        correlationId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/claims`, {
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

      logger.info('Claim submission response received', {
        claimId: result.data?.claimId,
        status: result.data?.status,
        riskScore: result.data?.riskScore,
        correlationId
      });

      return result.data;

    } catch (error) {
      logger.error('Claim submission failed', error as Error, {
        memberId: request.memberId,
        correlationId
      });

      return {
        claimId: '',
        claimNumber: '',
        status: 'SUBMITTED',
        receivedAt: new Date(),
        adjudicationPriority: 'NORMAL',
        estimatedProcessingTime: '72 hours'
      };
    }
  }

  async getClaimStatus(
    claimId: string,
    correlationId?: string
  ): Promise<ClaimStatusResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/claims/${claimId}`, {
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

  async getProviderSettlementSummary(
    providerId: number,
    periodStart?: Date,
    periodEnd?: Date,
    correlationId?: string
  ): Promise<SettlementSummary> {
    try {
      const params = new URLSearchParams();
      if (providerId) params.append('providerId', providerId.toString());
      if (periodStart) params.append('periodStart', periodStart.toISOString());
      if (periodEnd) params.append('periodEnd', periodEnd.toISOString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/claims/settlement/summary?${params}`, {
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
        return {
          totalClaims: 0,
          totalSubmittedAmount: 0,
          totalApprovedAmount: 0,
          totalPaidAmount: 0,
          pendingAmount: 0,
          averageProcessingTimeDays: 0,
          pendingClaims: 0,
          approvedClaims: 0,
          declinedClaims: 0,
          paidClaims: 0
        };
      }

      const result = await response.json();
      return result.data;

    } catch {
      return {
        totalClaims: 0,
        totalSubmittedAmount: 0,
        totalApprovedAmount: 0,
        totalPaidAmount: 0,
        pendingAmount: 0,
        averageProcessingTimeDays: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        declinedClaims: 0,
        paidClaims: 0
      };
    }
  }

  async checkDuplicateInvoice(
    providerId: number,
    invoiceNumber: string,
    correlationId?: string
  ): Promise<{ claimId: string; createdAt: Date } | null> {
    try {
      const params = new URLSearchParams();
      params.append('providerId', providerId.toString());
      params.append('invoiceNumber', invoiceNumber);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/claims/duplicate-check?${params}`, {
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

export const claimsServiceClient = ClaimsServiceClient.getInstance();
