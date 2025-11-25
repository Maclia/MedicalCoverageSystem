const API_BASE_URL = '/api';

// Scheme types
export interface Scheme {
  id: number;
  name: string;
  schemeCode: string;
  schemeType: string;
  description: string;
  targetMarket: string;
  pricingModel: string;
  isActive: boolean;
  launchDate?: string;
  sunsetDate?: string;
  minAge: number;
  maxAge?: number;
  planTierCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanTier {
  id: number;
  schemeId: number;
  tierLevel: string;
  tierName: string;
  tierDescription: string;
  overallAnnualLimit: number;
  networkAccessLevel: string;
  roomTypeCoverage: string;
  dentalCoverage: boolean;
  opticalCoverage: boolean;
  maternityCoverage: boolean;
  chronicCoverage: boolean;
  evacuationCoverage: boolean;
  internationalCoverage: boolean;
  wellnessBenefits: boolean;
  premiumMultiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedBenefit {
  id: number;
  parentId?: number;
  benefitCode: string;
  benefitName: string;
  benefitCategory: string;
  benefitSubcategory?: string;
  description: string;
  clinicalDefinitions?: string;
  icd10CoverageCodes?: string;
  cptProcedureCodes?: string;
  isOptional: boolean;
  isRider: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitRule {
  id: number;
  ruleName: string;
  ruleCategory: string;
  ruleType: string;
  rulePriority: number;
  conditionExpression: string;
  actionExpression: string;
  errorMessage?: string;
  isMandatory: boolean;
  isActive: boolean;
  version: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API functions
class SchemesAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Schemes
  async getSchemes(params?: {
    page?: number;
    limit?: number;
    schemeType?: string;
    targetMarket?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<Scheme>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `/schemes${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<Scheme>>(endpoint);
  }

  async getScheme(id: number): Promise<Scheme> {
    return this.request<Scheme>(`/schemes/${id}`);
  }

  async createScheme(scheme: Partial<Scheme>): Promise<Scheme> {
    return this.request<Scheme>('/schemes', {
      method: 'POST',
      body: JSON.stringify(scheme),
    });
  }

  async updateScheme(id: number, scheme: Partial<Scheme>): Promise<Scheme> {
    return this.request<Scheme>(`/schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheme),
    });
  }

  // Plan Tiers
  async getPlanTiers(schemeId: number): Promise<PlanTier[]> {
    return this.request<PlanTier[]>(`/schemes/${schemeId}/tiers`);
  }

  async createPlanTier(schemeId: number, tier: Partial<PlanTier>): Promise<PlanTier> {
    return this.request<PlanTier>(`/schemes/${schemeId}/tiers`, {
      method: 'POST',
      body: JSON.stringify({ ...tier, schemeId }),
    });
  }

  async updatePlanTier(schemeId: number, tierId: number, tier: Partial<PlanTier>): Promise<PlanTier> {
    return this.request<PlanTier>(`/schemes/${schemeId}/tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(tier),
    });
  }

  // Benefits
  async getBenefits(params?: {
    category?: string;
    parentId?: number;
    isActive?: boolean;
  }): Promise<EnhancedBenefit[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `/benefits${query ? `?${query}` : ''}`;

    return this.request<EnhancedBenefit[]>(endpoint);
  }

  async createBenefit(benefit: Partial<EnhancedBenefit>): Promise<EnhancedBenefit> {
    return this.request<EnhancedBenefit>('/benefits', {
      method: 'POST',
      body: JSON.stringify(benefit),
    });
  }

  // Rules
  async getRules(params?: {
    category?: string;
    isActive?: boolean;
  }): Promise<BenefitRule[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `/rules${query ? `?${query}` : ''}`;

    return this.request<BenefitRule[]>(endpoint);
  }

  async createRule(rule: Partial<BenefitRule>): Promise<BenefitRule> {
    return this.request<BenefitRule>('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  // Utility functions
  getSchemeTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      individual_medical: "Individual Medical",
      corporate_medical: "Corporate Medical",
      nhif_top_up: "NHIF Top-Up",
      student_cover: "Student Cover",
      international_health: "International Health",
      micro_insurance: "Micro Insurance"
    };
    return labels[type] || type;
  }

  getTargetMarketLabel(market: string): string {
    const labels: { [key: string]: string } = {
      individuals: "Individuals",
      small_groups: "Small Groups",
      large_corporates: "Large Corporates",
      students: "Students",
      seniors: "Seniors",
      expatriates: "Expatriates"
    };
    return labels[market] || market;
  }

  getPricingModelLabel(model: string): string {
    const labels: { [key: string]: string } = {
      age_rated: "Age Rated",
      community_rated: "Community Rated",
      group_rate: "Group Rate",
      experience_rated: "Experience Rated"
    };
    return labels[model] || model;
  }
}

export const schemesAPI = new SchemesAPI();
export default schemesAPI;