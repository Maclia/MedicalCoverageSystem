/**
 * Pricing Service API Client
 * Follows standard system API patterns
 */

import { apiRequest } from "@/lib/queryClient";

export interface PremiumCalculationInput {
  age: number;
  gender: 'MALE' | 'FEMALE';
  regionCode: string;
  coverLimit: number;
  coverType: string;
  riskCode: string;
  lifestyleCode: 'SMOKER' | 'NON_SMOKER';
  familySize: number;
  outpatientLimit?: number;
  schemeId?: string;
}

export interface CalculationStep {
  step: string;
  description: string;
  value: number;
  factor?: number;
  result: number;
}

export interface PremiumCalculationResult {
  basePremium: number;
  finalPremium: number;
  breakdown: CalculationStep[];
  rateTableId: string;
  calculationDate: Date;
  validUntil?: Date;
}

class PricingAPI {
  private readonly BASE_URL = '/api/pricing/v1';

  async calculatePremium(input: PremiumCalculationInput): Promise<PremiumCalculationResult> {
    const response = await apiRequest("POST", `${this.BASE_URL}/calculate`, {
      body: JSON.stringify(input)
    });
    const result = await response.json();
    return result.data || result;
  }

  async getActiveRateTable() {
    const response = await apiRequest("GET", `${this.BASE_URL}/rate-tables/active`);
    const result = await response.json();
    return result.data || result;
  }

  async generateQuote(request: any) {
    const response = await apiRequest("POST", `${this.BASE_URL}/quote/generate`, {
      body: JSON.stringify(request)
    });
    const result = await response.json();
    return result.data || result;
  }

  async createSchemeRateTable(schemeId: string, data: any) {
    const response = await apiRequest("POST", `${this.BASE_URL}/scheme/${schemeId}/rate-table`, {
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return result.data || result;
  }
}

export const pricingAPI = new PricingAPI();
export default pricingAPI;
