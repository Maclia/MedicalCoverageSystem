import { eq, and, desc, lte, gte } from 'drizzle-orm';
import { db } from '../config/database';
import { auditLogs } from '@shared/schema';
import { loggerInstance, generateCorrelationId } from '../utils/logger';

export interface AuditEventData {
  userId?: number | string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Create an audit log entry
   */
  async logAuditEvent(data: AuditEventData): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      const auditRecord = {
        userId: data.userId ? Number(data.userId) : null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        createdAt: new Date()
      };

      await db.insert(auditLogs).values(auditRecord);

      // Log to structured logger for additional tracking
      loggerInstance.info('AUDIT_EVENT', {
        audit: {
          ...data,
          timestamp: new Date().toISOString(),
          auditLogId: auditRecord // Will be populated after insert
        },
        correlationId
      });

      // Special handling for high-severity events
      if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
        await this.handleHighSeverityEvent(data, correlationId);
      }

    } catch (error) {
      loggerInstance.error('Failed to log audit event', error as Error, {
        auditData: data,
        correlationId
      }, correlationId);
      // Don't throw error - audit logging should not break application flow
    }
  }

  /**
   * Log data access events (read operations on sensitive data)
   */
  async logDataAccess(
    userId: number,
    entityType: string,
    entityId: string,
    accessType: string = 'VIEW',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent({
      userId,
      action: `DATA_${accessType.toUpperCase()}`,
      entityType,
      entityId,
      metadata: { accessType },
      ipAddress,
      userAgent,
      severity: entityType.includes('medical') || entityType.includes('patient') ? 'MEDIUM' : 'LOW'
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED',
    userId?: number,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    const severity = action === 'LOGIN_FAILED' || action === 'ACCOUNT_LOCKED' ? 'HIGH' : 'MEDIUM';

    await this.logAuditEvent({
      userId,
      action,
      entityType: 'Authentication',
      metadata: {
        email: email ? email.substring(0, 3) + '***' : undefined,
        reason
      },
      ipAddress,
      userAgent,
      severity
    });
  }

  /**
   * Log financial transactions (critical for compliance)
   */
  async logFinancialTransaction(
    userId: number,
    transactionType: string,
    entityType: string,
    entityId: string,
    amount?: number,
    currency?: string,
    status?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent({
      userId,
      action: `FINANCIAL_${transactionType.toUpperCase()}`,
      entityType,
      entityId,
      metadata: {
        transactionType,
        amount,
        currency,
        status
      },
      ipAddress,
      userAgent,
      severity: 'HIGH'
    });
  }

  /**
   * Log data modification events (create, update, delete)
   */
  async logDataModification(
    userId: number,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    changes?: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const sensitiveResources = ['member', 'patient', 'medical', 'claim', 'benefit', 'payment'];
    const severity = sensitiveResources.some(sr => entityType.toLowerCase().includes(sr)) ? 'HIGH' : 'MEDIUM';

    await this.logAuditEvent({
      userId,
      action: `DATA_${action}`,
      entityType,
      entityId,
      oldValue,
      newValue,
      metadata: { changes },
      ipAddress,
      userAgent,
      severity
    });
  }

  /**
   * Log configuration changes (system settings, policies, etc.)
   */
  async logConfigurationChange(
    userId: number,
    configurationType: string,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent({
      userId,
      action: 'CONFIG_CHANGE',
      entityType: 'SystemConfiguration',
      entityId: configurationType,
      oldValue,
      newValue,
      metadata: { configurationType },
      ipAddress,
      userAgent,
      severity: 'HIGH'
    });
  }

  /**
   * Get audit trail for a specific resource
   */
  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const records = await db
        .select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return records;
    } catch (error) {
      loggerInstance.error('Failed to retrieve audit trail', error as Error, {
        entityType,
        entityId
      });
      throw error;
    }
  }

  /**
   * Get audit trail for a specific user
   */
  async getUserAuditTrail(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).$dynamic();

      // Add date filters if provided
      if (startDate) {
        query = query.where(gte(auditLogs.createdAt, startDate));
      }
      if (endDate) {
        query = query.where(lte(auditLogs.createdAt, endDate));
      }

      const records = await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return records;
    } catch (error) {
      loggerInstance.error('Failed to retrieve user audit trail', error as Error, {
        userId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Handle high-severity audit events (additional notifications, alerts, etc.)
   */
  private async handleHighSeverityEvent(data: AuditEventData, correlationId: string): Promise<void> {
    loggerInstance.warn('HIGH_SEVERITY_AUDIT_EVENT', {
      audit: data,
      timestamp: new Date().toISOString(),
      correlationId
    }, correlationId);

    // TODO: Add additional high-severity handling:
    // - Send security alerts
    // - Create compliance tickets
    // - Notify security team
    // - Trigger automated reviews
  }

  /**
   * Create compliance report
   */
  async createComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: string = 'FULL_AUDIT'
  ): Promise<any> {
    try {
      // TODO: Implement comprehensive compliance reporting
      // - Data access patterns
      // - Financial transaction summary
      // - Authentication events
      // - Configuration changes
      // - Failed access attempts

      loggerInstance.info('Compliance report generated', {
        startDate,
        endDate,
        reportType
      });

      return {
        reportId: generateCorrelationId(),
        generatedAt: new Date(),
        period: { startDate, endDate },
        type: reportType,
        // TODO: Add actual report data
      };
    } catch (error) {
      loggerInstance.error('Failed to generate compliance report', error as Error, {
        startDate,
        endDate,
        reportType
      });
      throw error;
    }
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();

// Export convenience functions for common audit operations
export const logAuthEvent = auditService.logAuthEvent.bind(auditService);
export const logDataAccess = auditService.logDataAccess.bind(auditService);
export const logDataModification = auditService.logDataModification.bind(auditService);
export const logFinancialTransaction = auditService.logFinancialTransaction.bind(auditService);
export const logConfigurationChange = auditService.logConfigurationChange.bind(auditService);
export const getAuditTrail = auditService.getAuditTrail.bind(auditService);
