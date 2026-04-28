import BaseApiClient from '../../lib/baseApiClient';
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
export const usePremiumQuote = (quoteId: string) => {
  return {
    queryKey: ['premium-quote', quoteId],
    queryFn: () => getPremiumQuote(quoteId),
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  };
};