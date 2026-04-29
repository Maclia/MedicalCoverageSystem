import BaseApiClient from '@/lib/baseApiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const premiumCalculatorApi = new BaseApiClient('premium-calculator', '/api');

export interface PremiumCalculationInput {
  age: number;
  gender: 'MALE' | 'FEMALE';
  regionCode: string;
  coverLimit: number;
  riskCode: string;
  lifestyleCode: 'SMOKER' | 'NON_SMOKER';
  familySize: number;
  outpatientLimit: number;
  coverType: string;
}

export interface CalculationStep {
  step: string;
  description: string;
  value: number;
  factor?: number;
  result: number;
}

export interface PremiumCalculationResult {
  quoteId: string;
  basePremium: number;
  finalPremium: number;
  monthlyPremium: number;
  calculationDate: string;
  breakdown: CalculationStep[];
  factors: Record<string, number>;
  validUntil: string;
}

/**
 * Calculate premium using the premium-calculation-service API
 */
export const calculatePremium = async (input: PremiumCalculationInput): Promise<PremiumCalculationResult> => {
  const response = await premiumCalculatorApi.post<PremiumCalculationResult>('/premium/v1/calculate', input);
  return response.data as PremiumCalculationResult;
};

/**
 * Get existing premium quote by ID
 */
export const getPremiumQuote = async (quoteId: string): Promise<PremiumCalculationResult> => {
  const response = await premiumCalculatorApi.get<PremiumCalculationResult>(`/premium/v1/quote/${quoteId}`);
  return response.data as PremiumCalculationResult;
};

/**
 * React Query mutation hook for premium calculation
 * Persists calculation results and handles cache updates
 */
export const useCalculatePremiumMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calculatePremium,
    onSuccess: (data) => {
      // Persist quote in cache for future reference
      queryClient.setQueryData(['premium-quote', data.quoteId], data);
    },
    mutationKey: ['calculate-premium']
  });
};

/**
 * React Query hook to fetch existing quote
 */
export interface RateTable {
  id: string;
  name: string;
  type: 'AGE_BAND' | 'REGION' | 'COVER_LIMIT' | 'RISK_LEVEL' | 'LIFESTYLE';
  values: Array<{
    code: string;
    label: string;
    base?: number;
    factor?: number;
    min?: number;
    max?: number;
    value?: number;
  }>;
  effectiveDate: string;
  version: number;
  isActive: boolean;
}

/**
 * Get rate tables from database (persisted configuration)
 */
export const getRateTables = async (): Promise<RateTable[]> => {
  const response = await premiumCalculatorApi.get<RateTable[]>('/premium/v1/rate-tables');
  return response.data as RateTable[];
};

export const usePremiumQuote = (quoteId: string) => {
  return {
    queryKey: ['premium-quote', quoteId],
    queryFn: () => getPremiumQuote(quoteId),
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  };
};

/**
 * Batch calculate premiums for multiple members
 * Accepts array of calculation inputs and returns results in same order
 */
export const batchCalculatePremium = async (inputs: PremiumCalculationInput[]): Promise<PremiumCalculationResult[]> => {
  const response = await premiumCalculatorApi.post<PremiumCalculationResult[]>('/premium/v1/batch-calculate', inputs);
  return response.data as PremiumCalculationResult[];
};

/**
 * Scheme Override Interface
 * Defines corporate and custom scheme premium adjustments
 */
export interface SchemeOverride {
  id: string;
  schemeId: string;
  schemeName: string;
  overrideType: 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'BASE_RATE_OVERRIDE' | 'CUSTOM_RULE';
  value: number;
  conditions?: Record<string, unknown>;
  effectiveStart: string;
  effectiveEnd: string;
  isActive: boolean;
  priority: number;
}

/**
 * Get applicable scheme overrides for a specific company or group
 */
export const getSchemeOverrides = async (schemeId: string): Promise<SchemeOverride[]> => {
  const response = await premiumCalculatorApi.get<SchemeOverride[]>(`/premium/v1/schemes/${schemeId}/overrides`);
  return response.data as SchemeOverride[];
};

/**
 * Apply scheme override to premium calculation
 */
export const calculateWithSchemeOverride = async (
  input: PremiumCalculationInput,
  schemeId: string
): Promise<PremiumCalculationResult> => {
  const response = await premiumCalculatorApi.post<PremiumCalculationResult>(
    `/premium/v1/schemes/${schemeId}/calculate`,
    input
  );
  return response.data as PremiumCalculationResult;
};

/**
 * Audit Log Entry Interface
 * Tracks all changes to rate tables and calculation parameters
 */
export interface AuditLogEntry {
  id: string;
  entityType: 'RATE_TABLE' | 'SCHEME_OVERRIDE' | 'CALCULATION_CONFIG';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  userId: string;
  userName: string;
  timestamp: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changeReason?: string;
}

/**
 * Get audit log history for premium system
 */
export const getPremiumAuditLogs = async (filters?: {
  entityType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}): Promise<AuditLogEntry[]> => {
  const queryParams = new URLSearchParams(filters as Record<string, string>);
  const response = await premiumCalculatorApi.get<AuditLogEntry[]>(`/premium/v1/audit-logs?${queryParams.toString()}`);
  return response.data as AuditLogEntry[];
};

/**
 * Generate shareable quote token
 * Returns a short-lived token that can be shared via URL
 */
export const generateShareableQuoteToken = async (quoteId: string): Promise<{
  token: string;
  shareUrl: string;
  expiresAt: string;
}> => {
  const response = await premiumCalculatorApi.post<{
    token: string;
    shareUrl: string;
    expiresAt: string;
  }>(`/premium/v1/quotes/${quoteId}/share`, {});
  return response.data!;
};

/**
 * Retrieve quote using share token
 */
export const getQuoteByShareToken = async (shareToken: string): Promise<PremiumCalculationResult> => {
  const response = await premiumCalculatorApi.get<PremiumCalculationResult>(`/premium/v1/shared/${shareToken}`);
  return response.data as PremiumCalculationResult;
};

/**
 * Historical Premium Comparison
 */
export interface HistoricalPremiumComparison {
  comparisonDate: string;
  previousPremium: number;
  currentPremium: number;
  difference: number;
  percentageChange: number;
  factors: Record<string, {
    previous: number;
    current: number;
    impact: number;
  }>;
}

/**
 * Get historical premium comparison for a member profile
 */
export const getHistoricalComparison = async (
  input: PremiumCalculationInput,
  comparisonDate: string
): Promise<HistoricalPremiumComparison> => {
  const response = await premiumCalculatorApi.post<HistoricalPremiumComparison>(
    '/premium/v1/historical-comparison',
    {
      ...input,
      comparisonDate
    }
  );
  return response.data as HistoricalPremiumComparison;
};
