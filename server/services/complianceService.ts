import {
  auditLogs,
  memberConsents,
  members,
  companies,
  users
} from "../../shared/schema.js";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import { z } from "zod";

export interface AuditLogEntry {
  id: number;
  entityType: 'member' | 'company' | 'benefit' | 'claim' | 'document';
  entityId: number;
  action: 'create' | 'read' | 'update' | 'delete' | 'view';
  oldValues?: any;
  newValues?: any;
  performedBy?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  description?: string;
  performedByName?: string;
}

export interface ConsentRecord {
  id: number;
  memberId: number;
  consentType: 'data_processing' | 'marketing_communications' | 'data_sharing_providers' | 'data_sharing_partners' | 'wellness_programs';
  consentGiven: boolean;
  consentDate: string;
  expiryDate?: string;
  ipAddress?: string;
  userAgent?: string;
  documentVersion?: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
  memberName?: string;
}

export interface ComplianceReport {
  period: {
    startDate: string;
    endDate: string;
  };
  auditSummary: {
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByEntity: Record<string, number>;
    entriesByUser: Record<string, number>;
    suspiciousActivities: AuditLogEntry[];
  };
  consentSummary: {
    totalConsents: number;
    activeConsents: number;
    expiredConsents: number;
    withdrawnConsents: number;
    consentByType: Record<string, number>;
    consentsRequiringRenewal: ConsentRecord[];
  };
  dataPrivacyMetrics: {
    sensitiveDataAccessCount: number;
    dataSubjectRequests: number;
    dataBreaches: number;
    encryptionStatus: 'compliant' | 'partial' | 'non_compliant';
    retentionPolicyCompliance: number; // percentage
  };
}

export interface DataSubjectRequest {
  id: number;
  memberId: number;
  requestType: 'access' | 'portability' | 'rectification' | 'erasure' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestDate: string;
  completedDate?: string;
  details: string;
  response: string;
  processedBy?: number;
}

export interface DataBreachRecord {
  id: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  breachDate: string;
  discoveredDate: string;
  containedDate?: string;
  mitigationSteps: string[];
  notificationsSent: boolean;
  reportedToAuthorities: boolean;
  rootCause: string;
}

export interface ComplianceAuditReport {
  id: number;
  reportType: 'internal' | 'external' | 'regulatory';
  auditDate: string;
  auditorId?: number;
  findings: ComplianceFinding[];
  overallScore: number;
  recommendations: string[];
  actionItems: ComplianceActionItem[];
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
}

export interface ComplianceFinding {
  category: 'data_protection' | 'access_control' | 'audit_trail' | 'encryption' | 'retention' | 'consent' | 'breach_response';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  impact: string;
  recommendation: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ComplianceActionItem {
  id: number;
  title: string;
  description: string;
  assignedTo?: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class ComplianceService {

  // ============================================================================
  // AUDIT TRAIL MANAGEMENT
  // ============================================================================

  /**
   * Create comprehensive audit log entry
   */
  async createAuditLog(entry: {
    entityType: 'member' | 'company' | 'benefit' | 'claim' | 'document';
    entityId: number;
    action: 'create' | 'read' | 'update' | 'delete' | 'view';
    oldValues?: any;
    newValues?: any;
    performedBy?: number;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
  }): Promise<void> {
    try {
      // Sanitize sensitive data before logging
      const sanitizedOldValues = this.sanitizeAuditData(entry.oldValues);
      const sanitizedNewValues = this.sanitizeAuditData(entry.newValues);

      await db.insert(auditLogs).values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValues: sanitizedOldValues ? JSON.stringify(sanitizedOldValues) : null,
        newValues: sanitizedNewValues ? JSON.stringify(sanitizedNewValues) : null,
        performedBy: entry.performedBy,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date(),
        description: entry.description,
      });

      // Check for suspicious activity patterns
      await this.detectSuspiciousActivity(entry);

    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Non-blocking error - don't let audit failures break main functionality
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: {
    entityType?: string;
    entityId?: number;
    action?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      let query = db.select().from(auditLogs);

      // Apply filters
      if (filters.entityType) {
        query = query.where(eq(auditLogs.entityType, filters.entityType as any));
      }
      if (filters.entityId) {
        query = query.where(eq(auditLogs.entityId, filters.entityId));
      }
      if (filters.action) {
        query = query.where(eq(auditLogs.action, filters.action as any));
      }
      if (filters.userId) {
        query = query.where(eq(auditLogs.performedBy, filters.userId));
      }
      if (filters.startDate) {
        query = query.where(gte(auditLogs.timestamp, filters.startDate));
      }
      if (filters.endDate) {
        query = query.where(lte(auditLogs.timestamp, filters.endDate));
      }

      // Get total count
      const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(query.as('countQuery'));

      // Apply pagination and ordering
      query = query.orderBy(desc(auditLogs.timestamp));
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const logs = await query;

      // Enrich with user information
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const enrichedLog: AuditLogEntry = {
            ...log,
            oldValues: log.oldValues ? JSON.parse(log.oldValues) : undefined,
            newValues: log.newValues ? JSON.parse(log.newValues) : undefined,
          };

          if (log.performedBy) {
            const [user] = await db.select()
              .from(users)
              .where(eq(users.id, log.performedBy))
              .limit(1);

            enrichedLog.performedByName = user ? `${user.firstName} ${user.lastName}` : 'System';
          }

          return enrichedLog;
        })
      );

      return {
        logs: enrichedLogs,
        total: count,
      };

    } catch (error) {
      console.error("Failed to get audit logs:", error);
      throw error;
    }
  }

  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  /**
   * Record member consent
   */
  async recordConsent(consentData: {
    memberId: number;
    consentType: 'data_processing' | 'marketing_communications' | 'data_sharing_providers' | 'data_sharing_partners' | 'wellness_programs';
    consentGiven: boolean;
    expiryDate?: string;
    ipAddress?: string;
    userAgent?: string;
    documentVersion?: string;
  }): Promise<void> {
    try {
      // Check if consent already exists
      const [existingConsent] = await db.select()
        .from(memberConsents)
        .where(
          and(
            eq(memberConsents.memberId, consentData.memberId),
            eq(memberConsents.consentType, consentData.consentType),
            eq(memberConsents.consentGiven, true),
            sql`${memberConsents.withdrawnAt} IS NULL`
          )
        )
        .limit(1);

      if (existingConsent && consentData.consentGiven) {
        // Update existing consent
        await db.update(memberConsents)
          .set({
            consentDate: new Date(),
            expiryDate: consentData.expiryDate ? new Date(consentData.expiryDate) : null,
            ipAddress: consentData.ipAddress,
            userAgent: consentData.userAgent,
            documentVersion: consentData.documentVersion,
          })
          .where(eq(memberConsents.id, existingConsent.id));
      } else {
        // Create new consent record
        await db.insert(memberConsents).values({
          memberId: consentData.memberId,
          consentType: consentData.consentType,
          consentGiven: consentData.consentGiven,
          consentDate: new Date(),
          expiryDate: consentData.expiryDate ? new Date(consentData.expiryDate) : null,
          ipAddress: consentData.ipAddress,
          userAgent: consentData.userAgent,
          documentVersion: consentData.documentVersion,
        });

        // Create audit log for consent action
        await this.createAuditLog({
          entityType: 'member',
          entityId: consentData.memberId,
          action: consentData.consentGiven ? 'create' : 'delete',
          newValues: {
            consentType: consentData.consentType,
            consentGiven: consentData.consentGiven,
            consentDate: new Date(),
          },
          description: `Consent ${consentData.consentGiven ? 'granted' : 'denied'} for ${consentData.consentType}`,
        });
      }

    } catch (error) {
      console.error("Failed to record consent:", error);
      throw error;
    }
  }

  /**
   * Withdraw member consent
   */
  async withdrawConsent(memberId: number, consentType: string, reason: string): Promise<void> {
    try {
      await db.update(memberConsents)
        .set({
          withdrawnAt: new Date(),
          withdrawnReason: reason,
        })
        .where(
          and(
            eq(memberConsents.memberId, memberId),
            eq(memberConsents.consentType, consentType),
            eq(memberConsents.consentGiven, true),
            sql`${memberConsents.withdrawnAt} IS NULL`
          )
        );

      // Create audit log
      await this.createAuditLog({
        entityType: 'member',
        entityId: memberId,
        action: 'update',
        newValues: {
          consentType,
          withdrawnAt: new Date(),
          withdrawnReason: reason,
        },
        description: `Consent withdrawn for ${consentType}: ${reason}`,
      });

    } catch (error) {
      console.error("Failed to withdraw consent:", error);
      throw error;
    }
  }

  /**
   * Get member consents
   */
  async getMemberConsents(memberId: number): Promise<ConsentRecord[]> {
    try {
      const consents = await db.select()
        .from(memberConsents)
        .where(eq(memberConsents.memberId, memberId))
        .orderBy(desc(memberConsents.consentDate));

      // Enrich with member information
      const [member] = await db.select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      return consents.map(consent => ({
        ...consent,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
      }));

    } catch (error) {
      console.error("Failed to get member consents:", error);
      throw error;
    }
  }

  /**
   * Check for consents requiring renewal
   */
  async getConsentsRequiringRenewal(daysThreshold: number = 30): Promise<ConsentRecord[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const consents = await db.select()
        .from(memberConsents)
        .where(
          and(
            eq(memberConsents.consentGiven, true),
            sql`${memberConsents.withdrawnAt} IS NULL`,
            sql`${memberConsents.expiryDate} IS NOT NULL`,
            lte(memberConsents.expiryDate, thresholdDate.toISOString())
          )
        );

      // Enrich with member information
      return await Promise.all(
        consents.map(async (consent) => {
          const [member] = await db.select()
            .from(members)
            .where(eq(members.id, consent.memberId))
            .limit(1);

          return {
            ...consent,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
          };
        })
      );

    } catch (error) {
      console.error("Failed to get consents requiring renewal:", error);
      throw error;
    }
  }

  // ============================================================================
  // DATA PRIVACY & SECURITY
  // ============================================================================

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(startDate: string, endDate: string): Promise<ComplianceReport> {
    try {
      // Get audit logs for the period
      const auditLogs = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 10000, // Large limit for comprehensive report
      });

      // Get consent data
      const consentData = await db.select().from(memberConsents);

      // Calculate summaries
      const auditSummary = {
        totalEntries: auditLogs.total,
        entriesByAction: this.groupByField(auditLogs.logs, 'action'),
        entriesByEntity: this.groupByField(auditLogs.logs, 'entityType'),
        entriesByUser: this.groupByField(auditLogs.logs, 'performedByName'),
        suspiciousActivities: this.identifySuspiciousActivities(auditLogs.logs),
      };

      const consentSummary = {
        totalConsents: consentData.length,
        activeConsents: consentData.filter(c => c.consentGiven && !c.withdrawnAt && (!c.expiryDate || new Date(c.expiryDate) > new Date())).length,
        expiredConsents: consentData.filter(c => c.expiryDate && new Date(c.expiryDate) <= new Date()).length,
        withdrawnConsents: consentData.filter(c => c.withdrawnAt).length,
        consentByType: this.groupByField(consentData, 'consentType'),
        consentsRequiringRenewal: await this.getConsentsRequiringRenewal(),
      };

      // Data privacy metrics (simplified for demo)
      const dataPrivacyMetrics = {
        sensitiveDataAccessCount: auditLogs.logs.filter(log =>
          log.action === 'read' && (log.entityType === 'member' || log.entityType === 'document')
        ).length,
        dataSubjectRequests: 0, // Would be tracked in separate table
        dataBreaches: 0, // Would be tracked in separate table
        encryptionStatus: 'compliant' as const, // Would check actual implementation
        retentionPolicyCompliance: 95, // Would calculate actual compliance percentage
      };

      return {
        period: {
          startDate,
          endDate,
        },
        auditSummary,
        consentSummary,
        dataPrivacyMetrics,
      };

    } catch (error) {
      console.error("Failed to generate compliance report:", error);
      throw error;
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(entry: {
    entityType: string;
    entityId: number;
    action: string;
    performedBy?: number;
    ipAddress?: string;
  }): Promise<void> {
    try {
      // Check for multiple failed attempts from same IP
      if (entry.action === 'delete' || entry.action === 'update') {
        const recentFailedAttempts = await db.select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, entry.entityType as any),
              eq(auditLogs.entityId, entry.entityId),
              eq(auditLogs.ipAddress, entry.ipAddress || ''),
              sql`${auditLogs.timestamp} >= NOW() - INTERVAL '1 hour'`,
              inArray(auditLogs.action, ['delete', 'update', 'create'])
            )
          );

        if (recentFailedAttempts.length > 10) {
          // Trigger security alert
          await this.createSecurityAlert({
            type: 'suspicious_activity',
            severity: 'medium',
            description: `Multiple ${entry.action} attempts detected for ${entry.entityType} ${entry.entityId} from IP ${entry.ipAddress}`,
            ipAddress: entry.ipAddress,
            entityId: entry.entityId,
            entityType: entry.entityType,
          });
        }
      }

      // Check for unusual access patterns
      if (entry.action === 'read' && entry.entityType === 'member') {
        const recentAccesses = await db.select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, 'member'),
              eq(auditLogs.entityId, entry.entityId),
              eq(auditLogs.performedBy, entry.performedBy),
              sql`${auditLogs.timestamp} >= NOW() - INTERVAL '5 minutes'`
            )
          );

        if (recentAccesses.length > 20) {
          await this.createSecurityAlert({
            type: 'unusual_access_pattern',
            severity: 'low',
            description: `High frequency access to member ${entry.entityId} detected`,
            performedBy: entry.performedBy,
            entityId: entry.entityId,
          });
        }
      }

    } catch (error) {
      console.error("Failed to detect suspicious activity:", error);
    }
  }

  /**
   * Create security alert
   */
  private async createSecurityAlert(alert: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ipAddress?: string;
    performedBy?: number;
    entityId?: number;
    entityType?: string;
  }): Promise<void> {
    try {
      // This would log to a security alerts table
      // For now, we'll just create an audit log
      await this.createAuditLog({
        entityType: 'member', // Default for security alerts
        entityId: alert.entityId || 0,
        action: 'view', // Security review action
        newValues: alert,
        description: `Security Alert: ${alert.description}`,
        performedBy: alert.performedBy,
      });

    } catch (error) {
      console.error("Failed to create security alert:", error);
    }
  }

  /**
   * Identify suspicious activities from audit logs
   */
  private identifySuspiciousActivities(logs: AuditLogEntry[]): AuditLogEntry[] {
    const suspicious: AuditLogEntry[] = [];

    // Look for patterns like:
    // - Multiple delete operations on same entity
    // - Bulk operations outside business hours
    // - Access from unusual IPs
    // - Rapid successive operations

    const deletesByEntity = this.groupByField(
      logs.filter(log => log.action === 'delete'),
      'entityId'
    );

    Object.entries(deletesByEntity).forEach(([entityId, count]) => {
      if (count > 3) {
        const relevantLogs = logs.filter(log =>
          log.action === 'delete' && log.entityId.toString() === entityId
        );
        suspicious.push(...relevantLogs);
      }
    });

    return suspicious;
  }

  /**
   * Group array of objects by a field
   */
  private groupByField<T>(array: T[], field: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const key = String(item[field] || 'unknown');
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * Sanitize sensitive data for audit logging
   */
  private sanitizeAuditData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'nationalId',
      'passportNumber',
      'creditCardNumber',
      'bankAccountNumber',
      'password',
      'ssn',
      'medicalRecordNumber'
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        // Replace with masked version
        const value = String(sanitized[field]);
        if (value.length > 4) {
          sanitized[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
        } else {
          sanitized[field] = '***';
        }
      }
    }

    return sanitized;
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetentionCompliance(): Promise<{
    compliant: boolean;
    issues: Array<{
      entityType: string;
      recordCount: number;
      daysOld: number;
      recommendation: string;
    }>;
  }> {
    try {
      const issues = [];
      const now = new Date();

      // Check different retention periods
      const retentionRules = {
        member: 365 * 7, // 7 years for member records
        claim: 365 * 10, // 10 years for claims
        document: 365 * 5, // 5 years for documents
        audit_logs: 365 * 3, // 3 years for audit logs
      };

      for (const [entityType, retentionDays] of Object.entries(retentionRules)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // This would query the appropriate table based on entity type
        // For now, we'll use auditLogs as an example
        const oldRecords = await db.select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, entityType as any),
              lte(auditLogs.timestamp, cutoffDate.toISOString())
            )
          );

        if (oldRecords.length > 0) {
          issues.push({
            entityType,
            recordCount: oldRecords.length,
            daysOld: retentionDays,
            recommendation: `Archive or delete records older than ${retentionDays} days`
          });
        }
      }

      return {
        compliant: issues.length === 0,
        issues
      };

    } catch (error) {
      console.error("Failed to check data retention compliance:", error);
      throw error;
    }
  }

  /**
   * Generate GDPR data portability export
   */
  async generateDataPortabilityExport(memberId: number): Promise<{
    memberData: any;
    consents: ConsentRecord[];
    auditLogs: AuditLogEntry[];
    documents: any[];
    exportDate: string;
    expiryDate: string;
  }> {
    try {
      // Get member data
      const [member] = await db.select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      // Get consents
      const consents = await this.getMemberConsents(memberId);

      // Get audit logs for this member
      const auditResult = await this.getAuditLogs({
        entityType: 'member',
        entityId: memberId,
        limit: 1000,
      });

      // Get documents (would need to implement document access)
      const documents = []; // Placeholder

      return {
        memberData: member,
        consents,
        auditLogs: auditResult.logs,
        documents,
        exportDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

    } catch (error) {
      console.error("Failed to generate data portability export:", error);
      throw error;
    }
  }

  /**
   * Process data erasure request (right to be forgotten)
   */
  async processDataErasureRequest(memberId: number, reason: string, processedBy: number): Promise<{
    success: boolean;
    anonymizedData: any[];
    retainedData: any[];
    completionDate: string;
  }> {
    try {
      const anonymizedData = [];
      const retainedData = [];

      // Get member data before changes
      const [member] = await db.select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (!member) {
        throw new Error("Member not found");
      }

      // Anonymize personal information
      const anonymizedMember = await db.update(members)
        .set({
          firstName: 'Anonymous',
          lastName: 'Anonymous',
          email: `anonymous-${member.id}@deleted.local`,
          phone: 'DELETED',
          nationalId: null,
          passportNumber: null,
          address: 'DELETED',
          city: 'DELETED',
          postalCode: 'DELETED',
          disabilityDetails: null,
        })
        .where(eq(members.id, memberId))
        .returning();

      anonymizedData.push(anonymizedMember[0]);

      // Retain necessary data for legal/audit purposes
      const requiredRetention = {
        id: member.id,
        companyId: member.companyId,
        memberType: member.memberType,
        enrollmentDate: member.enrollmentDate,
        terminationDate: member.terminationDate,
        // Add other fields required for audit purposes
      };

      retainedData.push(requiredRetention);

      // Create audit log for erasure
      await this.createAuditLog({
        entityType: 'member',
        entityId: memberId,
        action: 'update',
        oldValues: member,
        newValues: anonymizedMember[0],
        performedBy,
        description: `Data erasure request processed: ${reason}`,
      });

      return {
        success: true,
        anonymizedData,
        retainedData,
        completionDate: new Date().toISOString(),
      };

    } catch (error) {
      console.error("Failed to process data erasure request:", error);
      throw error;
    }
  }
}

export const complianceService = new ComplianceService();