import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type StandardApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
    details?: unknown;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export interface BenefitRecord {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  coverageType?: string | null;
  coverageDetails?: string | null;
  limitAmount: number;
  hasWaitingPeriod: boolean;
  waitingPeriodDays?: number | null;
  isStandard: boolean;
  isActive?: boolean;
  createdAt?: string | null;
}

export interface CompanyBenefitRecord {
  id: number;
  companyId: number;
  benefitId: number;
  premiumId: number;
  isActive: boolean;
  additionalCoverage: boolean;
  additionalCoverageDetails?: string | null;
  limitAmount?: number | null;
  limitClause?: string | null;
  coverageRate?: number | null;
  createdAt?: string | null;
  companyName?: string | null;
  benefitName?: string | null;
  benefitCategory?: string | null;
}

type RawBenefit = Record<string, any>;
type RawCompanyBenefit = Record<string, any>;

const benefitsKeys = {
  all: ["benefits"] as const,
  list: (category?: string) => [...benefitsKeys.all, "list", category ?? "all"] as const,
  companyBenefits: (companyId?: string) => ["company-benefits", companyId ?? "all"] as const,
};

function normalizeBenefit(raw: RawBenefit): BenefitRecord {
  const standardLimit = Number(raw.standardLimit ?? raw.standard_limit ?? raw.limitAmount ?? 0);
  const waitingPeriod = Number(raw.standardWaitingPeriod ?? raw.standard_waiting_period ?? raw.waitingPeriodDays ?? 0);

  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    description: raw.description ?? null,
    category: String(raw.category ?? "other"),
    coverageType: raw.coverageType ?? raw.coverage_type ?? null,
    coverageDetails: raw.coverageDetails ?? raw.coverage_details ?? raw.description ?? null,
    limitAmount: Number.isFinite(standardLimit) ? standardLimit : 0,
    hasWaitingPeriod: waitingPeriod > 0 || Boolean(raw.hasWaitingPeriod),
    waitingPeriodDays: waitingPeriod || null,
    isStandard: raw.isStandard ?? true,
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

function normalizeCompanyBenefit(raw: RawCompanyBenefit): CompanyBenefitRecord {
  return {
    id: Number(raw.id),
    companyId: Number(raw.companyId ?? raw.company_id),
    benefitId: Number(raw.benefitId ?? raw.benefit_id),
    premiumId: Number(raw.premiumId ?? raw.premium_id),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    additionalCoverage: Boolean(raw.additionalCoverage ?? raw.additional_coverage ?? false),
    additionalCoverageDetails: raw.additionalCoverageDetails ?? raw.additional_coverage_details ?? null,
    limitAmount: raw.limitAmount ?? raw.limit_amount ?? null,
    limitClause: raw.limitClause ?? raw.limit_clause ?? null,
    coverageRate: raw.coverageRate ?? raw.coverage_rate ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    companyName: raw.companyName ?? raw.company_name ?? null,
    benefitName: raw.benefitName ?? raw.benefit_name ?? null,
    benefitCategory: raw.benefitCategory ?? raw.benefit_category ?? null,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function fetchBenefits(category?: string): Promise<BenefitRecord[]> {
  const params = new URLSearchParams();
  if (category && category !== "all") {
    params.set("category", category);
  }
  params.set("limit", "100");

  const url = `/api/benefits${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { credentials: "include" });
  const payload = await parseResponse<StandardApiResponse<RawBenefit[]>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Failed to load benefits");
  }

  return (payload.data ?? []).map(normalizeBenefit);
}

async function fetchCompanyBenefits(companyId?: string): Promise<CompanyBenefitRecord[]> {
  const params = new URLSearchParams();
  if (companyId && companyId !== "all") {
    params.set("companyId", companyId);
  }

  const url = `/api/company-benefits${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { credentials: "include" });
  const payload = await parseResponse<StandardApiResponse<RawCompanyBenefit[]>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Failed to load company benefits");
  }

  return (payload.data ?? []).map(normalizeCompanyBenefit);
}

export function useBenefits(category?: string) {
  return useQuery({
    queryKey: benefitsKeys.list(category),
    queryFn: () => fetchBenefits(category),
  });
}

export function useCompanyBenefits(companyId?: string) {
  return useQuery({
    queryKey: benefitsKeys.companyBenefits(companyId),
    queryFn: () => fetchCompanyBenefits(companyId),
  });
}

export function useCreateBenefitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/benefits", payload);
      return parseResponse<StandardApiResponse<RawBenefit>>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.all });
    },
  });
}

export function useCreateCompanyBenefitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/company-benefits", payload);
      return parseResponse<StandardApiResponse<RawCompanyBenefit>>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-benefits"] });
    },
  });
}
