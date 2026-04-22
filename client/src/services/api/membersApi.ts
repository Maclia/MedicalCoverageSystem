import { apiRequest } from "@/lib/queryClient";
import type {
  Member,
  Company,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberLifecycleRequest,
  BulkMemberRequest,
  MemberSearchRequest,
  MemberSearchResponse,
  ConsentRequest,
  BulkConsentRequest,
  DocumentUploadRequest,
  DocumentVerificationRequest,
  BulkCommunicationRequest,
  DashboardStats,
  MemberDocument,
  MemberConsent,
  AuditLog,
  CommunicationLog
} from "@/types/members";

class MembersAPI {
  private readonly BASE_URL = '/api';

  // Member Management Endpoints

  /**
   * Get all members with optional filtering
   */
  async getMembers(params?: MemberSearchRequest): Promise<MemberSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/members${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  /**
   * Get a specific member by ID
   */
  async getMember(id: number): Promise<Member> {
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${id}`);
    return response.json();
  }

  /**
   * Create a new member with enhanced enrollment
   */
  async createMember(memberData: CreateMemberRequest): Promise<Member> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/enroll`, {
      body: JSON.stringify(memberData),
    });
    return response.json();
  }

  /**
   * Update an existing member
   */
  async updateMember(memberData: UpdateMemberRequest): Promise<Member> {
    const { id, ...updateData } = memberData;
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${id}`, {
      body: JSON.stringify(updateData),
    });
    return response.json();
  }

  /**
   * Delete a member (soft delete)
   */
  async deleteMember(id: number, reason?: string): Promise<void> {
    await apiRequest("DELETE", `${this.BASE_URL}/members/${id}`, {
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Bulk member operations
   */
  async bulkOperation(request: BulkMemberRequest): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
    results?: Member[];
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/bulk`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  // Member Lifecycle Management

  /**
   * Activate a member
   */
  async activateMember(memberId: number, effectiveDate?: string): Promise<Member> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${memberId}/activate`, {
      body: JSON.stringify({}),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Suspend a member
   */
  async suspendMember(memberId: number, reason: string, notes?: string): Promise<Member> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${memberId}/suspend`, {
      body: JSON.stringify({ reason, notes }),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Reinstate a suspended member
   */
  async reinstateMember(memberId: number, notes?: string): Promise<Member> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${memberId}/reinstate`, {
      body: JSON.stringify({ notes }),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Terminate a member
   */
  async terminateMember(memberId: number, reason: string, terminationDate?: string, beneficiaryInfo?: any): Promise<Member> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${memberId}/terminate`, {
      body: JSON.stringify({ reason, terminationDate, beneficiaryInfo }),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Renew a member
   */
  async renewMember(memberId: number, renewalDate: string, newBenefitPackage?: number, notes?: string): Promise<Member> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/members/${memberId}/renew`, {
      body: JSON.stringify({ renewalDate, newBenefitPackage, notes }),
    });
    const result = await response.json();
    return result.data;
  }

  // Company Management

  /**
   * Get all companies
   */
  async getCompanies(params?: {
    clientType?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    companies: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/companies${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  /**
   * Get a specific company
   */
  async getCompany(id: number): Promise<Company> {
    const response = await apiRequest("GET", `${this.BASE_URL}/companies/${id}`);
    return response.json();
  }

  // Document Management

  /**
   * Get member documents
   */
  async getMemberDocuments(memberId: number): Promise<MemberDocument[]> {
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${memberId}/documents`);
    return response.json();
  }

  /**
   * Upload a member document
   */
  async uploadDocument(memberId: number, documentData: DocumentUploadRequest & {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  }): Promise<MemberDocument> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/${memberId}/documents`, {
      body: JSON.stringify(documentData),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Upload a document file (multipart form data)
   */
  async uploadDocumentFile(memberId: number, file: File, documentType: string, documentName: string): Promise<MemberDocument> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    formData.append('documentName', documentName);

    const response = await fetch(`${this.BASE_URL}/members/${memberId}/documents`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Verify a document
   */
  async verifyDocument(documentId: number, verificationData: DocumentVerificationRequest): Promise<MemberDocument> {
    const response = await apiRequest("POST", `${this.BASE_URL}/documents/${documentId}/verify`, {
      body: JSON.stringify(verificationData),
    });
    return response.json();
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number): Promise<void> {
    await apiRequest("DELETE", `${this.BASE_URL}/documents/${documentId}`);
  }

  // Consent Management

  /**
   * Get member consents
   */
  async getMemberConsents(memberId: number): Promise<MemberConsent[]> {
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${memberId}/consents`);
    return response.json();
  }

  /**
   * Update member consent
   */
  async updateConsent(memberId: number, consentData: ConsentRequest): Promise<MemberConsent> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/${memberId}/consents`, {
      body: JSON.stringify(consentData),
    });
    return response.json();
  }

  /**
   * Bulk consent operations
   */
  async bulkConsentOperation(request: BulkConsentRequest): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/consents/bulk`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  // Communication Management

  /**
   * Get communication logs
   */
  async getCommunicationLogs(params?: {
    memberId?: number;
    companyId?: number;
    communicationType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: CommunicationLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/communications${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  /**
   * Send bulk communication
   */
  async sendBulkCommunication(request: BulkCommunicationRequest): Promise<{
    success: boolean;
    scheduled: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/communications/bulk`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  // Audit Trail

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    entityType?: string;
    entityId?: number;
    action?: string;
    userId?: number;
    riskLevel?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/audit-logs${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  // Dashboard Statistics

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiRequest("GET", `${this.BASE_URL}/dashboard/stats`);
    return response.json();
  }

  // Utility Functions

  /**
   * Check member eligibility
   */
  async checkEligibility(memberId: number, benefitId?: number): Promise<{
    eligible: boolean;
    coverageAmount?: number;
    limitations?: string[];
    exclusions?: string[];
    requirements?: string[];
  }> {
    const params = benefitId ? `?benefitId=${benefitId}` : '';
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${memberId}/eligibility${params}`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Get member lifecycle history
   */
  async getMemberLifecycle(memberId: number): Promise<{
    member: Member;
    lifeEvents: any[];
  }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${memberId}/lifecycle`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Get communication history for a member
   */
  async getMemberCommunications(memberId: number): Promise<CommunicationLog[]> {
    const response = await apiRequest("GET", `${this.BASE_URL}/members/${memberId}/communications`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Send notification to member
   */
  async sendMemberNotification(memberId: number, communicationType: string, notificationData: {
    channel?: string;
    subject?: string;
    content?: string;
    recipient?: string;
  }): Promise<CommunicationLog> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/${memberId}/notify`, {
      body: JSON.stringify({
        communicationType,
        channel: notificationData.channel || 'email',
        subject: notificationData.subject,
        content: notificationData.content,
        recipient: notificationData.recipient,
      }),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Advanced member search
   */
  async searchMembers(params: {
    query?: string;
    companyId?: number;
    membershipStatus?: string;
    memberType?: string;
    dateOfBirth?: string;
    gender?: string;
    page?: number;
    limit?: number;
  }): Promise<MemberSearchResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/members/search${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    const result = await response.json();
    return result.data;
  }

  /**
   * Export member data
   */
  async exportMembers(params: MemberSearchRequest & {
    format: 'csv' | 'xlsx' | 'json';
    includeDocuments?: boolean;
    includeConsents?: boolean;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const query = queryParams.toString();
    const response = await fetch(`${this.BASE_URL}/members/export${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Generate member reports
   */
  async generateMemberReport(memberId: number, reportType: string): Promise<{
    reportId: string;
    downloadUrl: string;
    expiresAt: string;
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/members/${memberId}/reports`, {
      body: JSON.stringify({ reportType }),
    });
    return response.json();
  }
}

export const membersAPI = new MembersAPI();
export default membersAPI;