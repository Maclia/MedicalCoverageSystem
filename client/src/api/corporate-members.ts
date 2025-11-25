import { apiRequest } from "@/lib/queryClient";
import type { Member, Company } from "@/types/members";

interface BulkEnrollRequest {
  companyId: number;
  members: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    employeeId: string;
    memberType: "principal" | "dependent";
    principalId?: number;
    dependentType?: "spouse" | "child" | "parent" | "guardian";
    gender?: "male" | "female" | "other";
    maritalStatus?: "single" | "married" | "divorced" | "widowed";
    nationalId?: string;
    gradeId?: number;
    department?: string;
    jobTitle?: string;
  }>;
  autoActivate?: boolean;
  sendWelcomeNotifications?: boolean;
}

interface BulkUpdateRequest {
  companyId: number;
  memberIds: number[];
  updateType: "suspend" | "activate" | "terminate" | "update_grade" | "update_department";
  updateData: Record<string, any>;
  reason: string;
  sendNotifications?: boolean;
}

interface BulkNotificationRequest {
  companyId: number;
  memberIds?: number[];
  communicationType: "enrollment_confirmation" | "renewal_notification" | "card_generation" |
                    "pre_auth_update" | "limit_reminder" | "payment_due" | "suspension_notice" | "termination_notice";
  channel: "sms" | "email" | "mobile_app";
  subject: string;
  content: string;
  sendToAllMembers?: boolean;
}

interface EmployeeGradeRequest {
  companyId: number;
  gradeCode: string;
  gradeName: string;
  level: number;
  description?: string;
}

interface DependentRuleRequest {
  companyId: number;
  dependentType: "spouse" | "child" | "parent" | "guardian";
  maxAge?: number;
  maxCount?: number;
  documentationRequired?: string[];
  isActive?: boolean;
}

interface BulkOperationResult {
  successful: any[];
  failed: Array<{
    member?: any;
    memberId?: number;
    error: string;
  }>;
  totalProcessed: number;
}

class CorporateMembersAPI {
  private readonly BASE_URL = '/api';

  // Bulk Member Operations

  /**
   * Bulk enroll members for a company
   */
  async bulkEnroll(request: BulkEnrollRequest): Promise<BulkOperationResult> {
    const response = await apiRequest("POST", `${this.BASE_URL}/companies/${request.companyId}/members/bulk-enroll`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Upload bulk member enrollment file (CSV/Excel)
   */
  async bulkUpload(companyId: number, file: File, options: {
    autoActivate?: boolean;
    sendWelcomeNotifications?: boolean;
  }): Promise<BulkOperationResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.autoActivate !== undefined) {
      formData.append('autoActivate', String(options.autoActivate));
    }
    if (options.sendWelcomeNotifications !== undefined) {
      formData.append('sendWelcomeNotifications', String(options.sendWelcomeNotifications));
    }

    const response = await fetch(`${this.BASE_URL}/companies/${companyId}/members/bulk-upload`, {
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
   * Bulk update members
   */
  async bulkUpdate(request: BulkUpdateRequest): Promise<BulkOperationResult> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/companies/${request.companyId}/members/bulk-update`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Send bulk notifications to company members
   */
  async sendBulkNotification(request: BulkNotificationRequest): Promise<BulkOperationResult> {
    const response = await apiRequest("POST", `${this.BASE_URL}/companies/${request.companyId}/members/broadcast`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Export company member data
   */
  async exportMembers(companyId: number, options: {
    format?: 'csv' | 'excel';
    includeInactive?: boolean;
    includeDependents?: boolean;
  } = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const query = queryParams.toString();
    const response = await fetch(`${this.BASE_URL}/companies/${companyId}/members/export${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Employee Grade Management

  /**
   * Create employee grade
   */
  async createEmployeeGrade(request: EmployeeGradeRequest): Promise<any> {
    const response = await apiRequest("POST", `${this.BASE_URL}/companies/${request.companyId}/grades`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Get all employee grades for a company
   */
  async getEmployeeGrades(companyId: number): Promise<any[]> {
    const response = await apiRequest("GET", `${this.BASE_URL}/companies/${companyId}/grades`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Update employee grade
   */
  async updateEmployeeGrade(companyId: number, gradeId: number, updateData: Partial<EmployeeGradeRequest>): Promise<any> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/companies/${companyId}/grades/${gradeId}`, {
      body: JSON.stringify(updateData),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Delete employee grade
   */
  async deleteEmployeeGrade(companyId: number, gradeId: number): Promise<void> {
    await apiRequest("DELETE", `${this.BASE_URL}/companies/${companyId}/grades/${gradeId}`);
  }

  // Dependent Rules Management

  /**
   * Create dependent rule
   */
  async createDependentRule(request: DependentRuleRequest): Promise<any> {
    const response = await apiRequest("POST", `${this.BASE_URL}/companies/${request.companyId}/dependent-rules`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Get all dependent rules for a company
   */
  async getDependentRules(companyId: number): Promise<any[]> {
    const response = await apiRequest("GET", `${this.BASE_URL}/companies/${request.companyId}/dependent-rules`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Update dependent rule
   */
  async updateDependentRule(companyId: number, ruleId: number, updateData: Partial<DependentRuleRequest>): Promise<any> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/companies/${companyId}/dependent-rules/${ruleId}`, {
      body: JSON.stringify(updateData),
    });
    const result = await response.json();
    return result.data;
  }

  /**
   * Delete dependent rule
   */
  async deleteDependentRule(companyId: number, ruleId: number): Promise<void> {
    await apiRequest("DELETE", `${this.BASE_URL}/companies/${companyId}/dependent-rules/${ruleId}`);
  }

  // Company Members Management

  /**
   * Get all members for a company
   */
  async getCompanyMembers(companyId: number, options: {
    includeInactive?: boolean;
    includeDependents?: boolean;
    memberType?: 'principal' | 'dependent';
    membershipStatus?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    members: Member[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const query = queryParams.toString();
    const response = await apiRequest("GET", `${this.BASE_URL}/companies/${companyId}/members${query ? `?${query}` : ''}`);
    return response.json();
  }

  /**
   * Get member statistics for a company
   */
  async getCompanyMemberStats(companyId: number): Promise<{
    totalMembers: number;
    activeMembers: number;
    suspendedMembers: number;
    terminatedMembers: number;
    principalMembers: number;
    dependents: number;
    recentRegistrations: number;
    documentsUploaded: number;
    consentsGiven: number;
  }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/companies/${companyId}/members/stats`);
    const result = await response.json();
    return result.data;
  }

  // Utility Functions

  /**
   * Generate bulk enrollment template
   */
  async generateBulkEnrollmentTemplate(companyId: number, format: 'csv' | 'excel' = 'excel'): Promise<Blob> {
    const response = await fetch(`${this.BASE_URL}/companies/${companyId}/members/template?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Template generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Validate bulk enrollment data
   */
  async validateBulkEnrollmentData(request: BulkEnrollRequest): Promise<{
    valid: boolean;
    errors: Array<{
      row: number;
      field: string;
      message: string;
      member: any;
    }>;
    warnings: Array<{
      row: number;
      message: string;
      member: any;
    }>;
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/companies/${request.companyId}/members/validate-bulk`, {
      body: JSON.stringify(request),
    });
    const result = await response.json();
    return result.data;
  }
}

export const corporateMembersAPI = new CorporateMembersAPI();
export default corporateMembersAPI;