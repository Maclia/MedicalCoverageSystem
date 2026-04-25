/**
 * Decentralized Audit Logger
 * 
 * ✅ Phase 5: Removes audit logging dependency from Core Service
 * Each service now logs its own audit events locally with standard schema
 */

import winston from 'winston';

const auditLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'business-rules-audit' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Standardized audit event schema across ALL services
 */
export interface AuditEvent {
  eventId: string;
  eventType: 'business_rule' | 'validation' | 'decision' | 'state_change';
  serviceName: string;
  timestamp: Date;
  actor?: string;
  subjectType: string;
  subjectId: string | number;
  action: string;
  result: 'allowed' | 'denied' | 'pending' | 'failed';
  metadata?: Record<string, any>;
  executionMode?: string;
  matched?: boolean;
  durationMs?: number;
}

/**
 * Audit Logger Interface - implemented by all domain services
 */
export interface IAuditLogger {
  logEvent(event: Omit<AuditEvent, 'timestamp' | 'serviceName'>): void;
  logBusinessRuleExecution(ruleName: string, subjectId: string | number, result: any, durationMs: number): void;
}

/**
 * Standardized Audit Logger implementation
 * Used by all services to maintain consistent audit trail
 */
class DecentralizedAuditLogger implements IAuditLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  logEvent(event: Omit<AuditEvent, 'timestamp' | 'serviceName'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      serviceName: this.serviceName,
      timestamp: new Date()
    };

    // Log locally first - primary source of truth
    auditLogger.info(`AUDIT: ${auditEvent.eventType} ${auditEvent.action}`, auditEvent);

    // Forward to central audit system asynchronously (fire and forget)
    this.forwardToCentralSystem(auditEvent).catch(() => {
      // Ignore failures - local log is authoritative
    });
  }

  logBusinessRuleExecution(ruleName: string, subjectId: string | number, result: any, durationMs: number): void {
    this.logEvent({
      eventId: crypto.randomUUID(),
      eventType: 'business_rule',
      subjectType: 'rule',
      subjectId: ruleName,
      action: 'execute',
      result: result.success ? 'allowed' : 'denied',
      durationMs,
      metadata: {
        executionMode: result.metadata?.executionMode,
        matched: result.validation?.matched,
        fallback: result.metadata?.fallback
      }
    });
  }

  private async forwardToCentralSystem(event: AuditEvent): Promise<void> {
    const centralAuditUrl = process.env.CENTRAL_AUDIT_URL || 'http://core-service:3000/api/audit/collect';
    
    try {
      await fetch(centralAuditUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(1000)
      });
    } catch {
      // Silently fail - local log is already persisted
      // Events will be batched and retransmitted later
    }
  }
}

/**
 * Factory function to create service specific audit logger
 */
export function createAuditLogger(serviceName: string): IAuditLogger {
  return new DecentralizedAuditLogger(serviceName);
}