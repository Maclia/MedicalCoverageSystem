import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Compliance metrics interface
export interface ComplianceMetrics {
  dataPrivacy: {
    score: number;
    trends: Array<{ month: string; score: number }>;
    issues: Array<{ type: string; count: number; severity: 'low' | 'medium' | 'high' }>;
  };
  audit: {
    totalLogs: number;
    suspiciousActivity: number;
    failedLogins: number;
    dataAccess: number;
  };
  consentManagement: {
    totalConsents: number;
    activeConsents: number;
    expiredConsents: number;
    pendingRenewal: number;
    consentTypes: Array<{
      name: string;
      granted: number;
      denied: number;
    }>;
  };
}

// Audit log interface
export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: number;
  details: string;
  ipAddress: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Security alert interface
export interface SecurityAlert {
  id: number;
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  status: 'pending' | 'investigating' | 'resolved';
}

// Consent management interface
export interface ConsentRecord {
  id: number;
  memberId: number;
  memberName: string;
  consentType: string;
  consentGiven: boolean;
  consentDate: string;
  expiryDate: string | null;
  ipAddress: string;
  userAgent: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
}

// Hook for fetching compliance metrics
export function useComplianceMetrics(timeRange?: string) {
  return useQuery<ComplianceMetrics>({
    queryKey: ['/api/compliance/metrics', timeRange],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/compliance/metrics?timeRange=${timeRange || '30d'}`);
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Hook for fetching audit logs with filters
export function useAuditLogs(filters: {
  searchTerm?: string;
  entity?: string;
  timeRange?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();

  if (filters.searchTerm) params.append('search', filters.searchTerm);
  if (filters.entity && filters.entity !== 'all') params.append('entity', filters.entity);
  if (filters.timeRange) params.append('timeRange', filters.timeRange);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return useQuery<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['/api/compliance/audit-logs', filters],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/compliance/audit-logs?${params.toString()}`);
      return response.json();
    },
    keepPreviousData: true, // Keep previous data while fetching new data for pagination
  });
}

// Hook for fetching security alerts
export function useSecurityAlerts(status?: string) {
  return useQuery<SecurityAlert[]>({
    queryKey: ['/api/compliance/security-alerts', status],
    queryFn: async () => {
      const url = status ? `/api/compliance/security-alerts?status=${status}` : '/api/compliance/security-alerts';
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchInterval: 60 * 1000, // Refetch every minute for real-time alerts
  });
}

// Hook for fetching consent records
export function useConsentRecords(filters: {
  memberId?: number;
  consentType?: string;
  status?: string;
  expiring?: boolean;
}) {
  const params = new URLSearchParams();

  if (filters.memberId) params.append('memberId', filters.memberId.toString());
  if (filters.consentType) params.append('consentType', filters.consentType);
  if (filters.status) params.append('status', filters.status);
  if (filters.expiring) params.append('expiring', 'true');

  return useQuery<ConsentRecord[]>({
    queryKey: ['/api/compliance/consents', filters],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/compliance/consents?${params.toString()}`);
      return response.json();
    },
  });
}

// Hook for fetching compliance reports
export function useComplianceReports() {
  return useQuery<Array<{
    id: string;
    name: string;
    type: string;
    lastGenerated: string;
    status: 'compliant' | 'non-compliant' | 'warning';
    downloadUrl: string;
    recordCount?: number;
    findings?: number;
  }>>({
    queryKey: ['/api/compliance/reports'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/compliance/reports');
      return response.json();
    },
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });
}

// Hook for generating compliance report
export function useGenerateReport() {
  const generateReport = async (reportType: string, filters?: Record<string, any>) => {
    const response = await apiRequest("POST", '/api/compliance/reports/generate', {
      reportType,
      filters
    });
    return response.json();
  };

  return { generateReport };
}

// Hook for resolving security alerts
export function useResolveAlert() {
  const resolveAlert = async (alertId: number, resolution: string) => {
    const response = await apiRequest("PUT", `/api/compliance/security-alerts/${alertId}/resolve`, {
      resolution
    });
    return response.json();
  };

  return { resolveAlert };
}

// Hook for managing member consents
export function useManageConsent() {
  const updateConsent = async (memberId: number, consentType: string, consentGiven: boolean) => {
    const response = await apiRequest("PUT", `/api/compliance/consents/${memberId}`, {
      consentType,
      consentGiven
    });
    return response.json();
  };

  const withdrawConsent = async (consentId: number, reason: string) => {
    const response = await apiRequest("DELETE", `/api/compliance/consents/${consentId}`, {
      reason
    });
    return response.json();
  };

  const sendConsentRenewals = async (filters: { consentType?: string; memberId?: number }) => {
    const response = await apiRequest("POST", '/api/compliance/consents/send-renewals', filters);
    return response.json();
  };

  return { updateConsent, withdrawConsent, sendConsentRenewals };
}

// Hook for exporting audit logs
export function useExportAuditLogs() {
  const exportLogs = async (filters: {
    startDate?: string;
    endDate?: string;
    entity?: string;
    riskLevel?: string;
    format?: 'csv' | 'xlsx' | 'json';
  }) => {
    const response = await apiRequest("POST", '/api/compliance/audit-logs/export', filters);

    // Handle file download
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${filters.format || 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return response;
  };

  return { exportLogs };
}