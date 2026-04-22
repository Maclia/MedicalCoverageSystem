import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export interface AdminActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "blue" | "green" | "yellow" | "purple" | "red";
}

export interface AdminDashboardSummary {
  quickStats: {
    activeMembers: number;
    onboardingCompletionRate: number;
    pendingDocuments: number;
    emailsSentToday: number;
  };
  performance: {
    sevenDayCompletionRate: number;
    averageDaysToComplete: number;
    dailyActiveUsers: number;
    portalAdoptionRate: number;
  };
  documentSummary: {
    pending: number;
    needsMoreInfo: number;
    processed: number;
  };
  recentActivity: AdminActivityItem[];
}

export interface AdminDocumentStats {
  pending: number;
  approved: number;
  rejected: number;
  needsMoreInfo: number;
  avgReviewTime: number;
  todayProcessed: number;
}

export interface AdminDocumentRecord {
  id: string;
  memberId: string;
  memberName: string;
  companyName: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  reviewStatus: "pending" | "approved" | "rejected" | "needs_more_info";
  reviewedBy?: string | number | null;
  reviewedDate?: string | null;
  reviewNotes?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  extractedText?: string | null;
  confidenceScore?: number | null;
  expirationDate?: string | null;
  isRequired: boolean;
  downloadUrl?: string | null;
}

export interface AdminDocumentQueueResponse {
  documents: AdminDocumentRecord[];
  stats: AdminDocumentStats;
}

export interface AdminServiceHealth {
  name: string;
  healthy: boolean;
  responseTime: number;
  circuitBreakerOpen: boolean;
}

const adminKeys = {
  all: ["admin"] as const,
  dashboard: () => [...adminKeys.all, "dashboard"] as const,
  documents: (filters: Record<string, string>) => [...adminKeys.all, "documents", filters] as const,
  services: () => [...adminKeys.all, "services"] as const,
};

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function fetchAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await fetch("/api/admin/dashboard/summary", { credentials: "include" });
  const payload = await readJson<ApiEnvelope<AdminDashboardSummary>>(response);

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Failed to load admin dashboard summary");
  }

  return payload.data;
}

async function fetchAdminDocumentQueue(filters: Record<string, string>): Promise<AdminDocumentQueueResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, value);
    }
  });

  const url = `/api/admin/documents/review-queue${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { credentials: "include" });
  const payload = await readJson<ApiEnvelope<AdminDocumentQueueResponse>>(response);

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Failed to load document review queue");
  }

  return payload.data;
}

async function fetchAdminServicesHealth(): Promise<AdminServiceHealth[]> {
  const response = await fetch("/api/admin/services/health", { credentials: "include" });
  const payload = await readJson<ApiEnvelope<{ serviceHealth?: AdminServiceHealth[] }>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load service health");
  }

  return payload.data?.serviceHealth ?? [];
}

async function reviewDocument(payload: {
  documentId: string;
  action: "approve" | "reject" | "request_info";
  notes?: string;
}) {
  const response = await apiRequest("POST", `/api/admin/documents/${payload.documentId}/review`, {
    action: payload.action,
    notes: payload.notes,
  });

  return readJson<ApiEnvelope<unknown>>(response);
}

export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: fetchAdminDashboardSummary,
  });
}

export function useAdminDocumentQueue(filters: {
  status: string;
  search: string;
  documentType: string;
  priority: string;
}) {
  return useQuery({
    queryKey: adminKeys.documents(filters),
    queryFn: () => fetchAdminDocumentQueue(filters),
  });
}

export function useAdminServicesHealth() {
  return useQuery({
    queryKey: adminKeys.services(),
    queryFn: fetchAdminServicesHealth,
    refetchInterval: 60_000,
  });
}

export function useReviewDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
