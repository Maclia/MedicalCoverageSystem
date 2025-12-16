import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { auditLogs } from '../models/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface AuditEntryData {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  requestBody?: any;
  responseStatus: 'success' | 'failure';
  timestamp: Date;
  correlationId?: string;
}

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async createAuditEntry(data: AuditEntryData, correlationId?: string) {
    try {
      logger.debug('Creating audit entry', {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        correlationId
      });

      // Prepare audit data for database insertion
      const auditData = {
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        duration: data.duration,
        ipAddress: data.ip,
        userAgent: data.userAgent,
        requestBody: data.requestBody ? JSON.stringify(data.requestBody) : null,
        responseStatus: data.responseStatus,
        timestamp: data.timestamp,
        correlationId: data.correlationId
      };

      // Insert audit log into database
      const [auditEntry] = await db
        .insert(auditLogs)
        .values(auditData)
        .returning();

      logger.info('Audit entry created successfully', {
        auditId: auditEntry.id,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        correlationId
      });

      return auditEntry;
    } catch (error) {
      logger.error('Failed to create audit entry', error as Error, {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        correlationId
      });
      throw error;
    }
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      resourceId?: string;
      dateRange?: { start: Date; end: Date };
      responseStatus?: 'success' | 'failure';
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ) {
    try {
      logger.debug('Retrieving audit logs', {
        filters,
        pagination,
        correlationId
      });

      let query = db.select().from(auditLogs);

      // Apply filters
      if (filters.userId) {
        query = query.where(eq(auditLogs.userId, filters.userId));
      }

      if (filters.action) {
        query = query.where(eq(auditLogs.action, filters.action));
      }

      if (filters.resource) {
        query = query.where(eq(auditLogs.resource, filters.resource));
      }

      if (filters.resourceId) {
        query = query.where(eq(auditLogs.resourceId, filters.resourceId));
      }

      if (filters.responseStatus) {
        query = query.where(eq(auditLogs.responseStatus, filters.responseStatus));
      }

      // Get total count for pagination
      const [totalResult] = await query.select({ count: { count: '*' } });
      const total = Number(totalResult.count);

      // Apply pagination and ordering
      const results = await query
        .orderBy(auditLogs.timestamp)
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Audit logs retrieved', {
        total,
        filters,
        pagination,
        correlationId
      });

      return {
        success: true,
        data: results,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Failed to retrieve audit logs', error as Error, {
        filters,
        pagination,
        correlationId
      });
      throw error;
    }
  }

  async getAuditEntryById(id: number, correlationId?: string) {
    try {
      const [auditEntry] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, id))
        .limit(1);

      if (!auditEntry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Audit entry not found',
            details: { id }
          }
        };
      }

      logger.debug('Audit entry retrieved', {
        auditId: id,
        correlationId
      });

      return {
        success: true,
        data: auditEntry
      };
    } catch (error) {
      logger.error('Failed to retrieve audit entry', error as Error, {
        auditId: id,
        correlationId
      });
      throw error;
    }
  }

  async getAuditStatistics(correlationId?: string) {
    try {
      logger.debug('Retrieving audit statistics', { correlationId });

      // Get total audit entries
      const [totalEntries] = await db
        .select({ count: { count: '*' } })
        .from(auditLogs);

      // Get action distribution
      const actionStats = await db
        .select({
          action: auditLogs.action,
          count: { count: '*' }
        })
        .from(auditLogs)
        .groupBy(auditLogs.action)
        .orderBy({ count: { count: 'desc' } });

      // Get resource distribution
      const resourceStats = await db
        .select({
          resource: auditLogs.resource,
          count: { count: '*' }
        })
        .from(auditLogs)
        .groupBy(auditLogs.resource)
        .orderBy({ count: { count: 'desc' } });

      // Get status distribution
      const statusStats = await db
        .select({
          responseStatus: auditLogs.responseStatus,
          count: { count: '*' }
        })
        .from(auditLogs)
        .groupBy(auditLogs.responseStatus);

      // Get entries by date (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const entriesByDate = await db
        .select({
          date: auditLogs.timestamp,
          count: { count: '*' }
        })
        .from(auditLogs)
        .where(auditLogs.timestamp >= thirtyDaysAgo)
        .groupBy(auditLogs.timestamp)
        .orderBy(auditLogs.timestamp);

      const statistics = {
        totalEntries: Number(totalEntries.count),
        actionDistribution: actionStats,
        resourceDistribution: resourceStats,
        statusDistribution: statusStats,
        entriesByDate,
        generatedAt: new Date().toISOString()
      };

      logger.info('Audit statistics retrieved', {
        totalEntries: statistics.totalEntries,
        correlationId
      });

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      logger.error('Failed to retrieve audit statistics', error as Error, { correlationId });
      throw error;
    }
  }

  async cleanupOldAuditLogs(daysToKeep: number = 365, correlationId?: string) {
    try {
      logger.info('Starting audit log cleanup', {
        daysToKeep,
        correlationId
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Delete old audit entries
      const deleteResult = await db
        .delete(auditLogs)
        .where(auditLogs.timestamp < cutoffDate);

      const deletedCount = Number(deleteResult);

      logger.info('Audit log cleanup completed', {
        deletedCount,
        cutoffDate,
        daysToKeep,
        correlationId
      });

      return {
        success: true,
        data: {
          deletedCount,
          cutoffDate,
          daysToKeep
        }
      };
    } catch (error) {
      logger.error('Failed to cleanup audit logs', error as Error, {
        daysToKeep,
        correlationId
      });
      throw error;
    }
  }
}

export const auditService = AuditService.getInstance();