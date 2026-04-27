/**
 * Decentralized Audit Logger
 * 
 * ✅ Phase 5: Removes audit logging dependency from Core Service
 * Each service now logs its own audit events locally with standard schema
 */

import winston from 'winston';

// ✅ Production Optimized Logger Configuration
// Disables debug logging in production environment
const isProduction = process.env.NODE_ENV === 'production';

const auditLogger = winston.createLogger({
  level: isProduction ? 'warn' : (process.env.LOG_LEVEL || 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'business-rules-audit' },
  transports: [
    new winston.transports.Console({
      format: isProduction 
        ? winston.format.json() 
        : winston.format.combine(
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
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 1000;
  private readonly MAX_QUEUE_SIZE = 10000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    
    // Start background flush worker
    this.flushTimer = setInterval(() => this.processQueue(), this.FLUSH_INTERVAL);
  }

  logEvent(event: Omit<AuditEvent, 'timestamp' | 'serviceName'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      serviceName: this.serviceName,
      timestamp: new Date()
    };

    // Log locally first - primary source of truth
    auditLogger.info(`AUDIT: ${auditEvent.eventType} ${auditEvent.action}`, auditEvent);

    // ✅ Add to background queue instead of synchronous forwarding
    if (this.eventQueue.length < this.MAX_QUEUE_SIZE) {
      this.eventQueue.push(auditEvent);
    } else {
      // Queue full - drop oldest events to protect main request path
      this.eventQueue.shift();
      this.eventQueue.push(auditEvent);
      auditLogger.warn('Audit log queue full - oldest event dropped', { 
        queueSize: this.eventQueue.length 
      });
    }

    // Trigger immediate processing if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE && !this.isProcessing) {
      setImmediate(() => this.processQueue());
    }
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

  /**
   * ✅ Background queue processor
   * Runs asynchronously, never blocks main request thread
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Take batch from queue
      const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
      
      const centralAuditUrl = process.env.CENTRAL_AUDIT_URL || 'http://core-service:3000/api/audit/collect';
      
      try {
        await fetch(centralAuditUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(5000)
        });
        
        if (!isProduction) {
          auditLogger.debug('Audit batch submitted successfully', { 
            batchSize: batch.length,
            remaining: this.eventQueue.length
          });
        }
        
      } catch {
        // Failed - return events to front of queue for retry
        this.eventQueue.unshift(...batch);
        auditLogger.warn('Audit batch submission failed - will retry', { 
          batchSize: batch.length,
          retryQueueSize: this.eventQueue.length
        });
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Graceful shutdown - flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events on shutdown
    while (this.eventQueue.length > 0) {
      await this.processQueue();
    }
  }
}

/**
 * Factory function to create service specific audit logger
 */
export function createAuditLogger(serviceName: string): IAuditLogger {
  return new DecentralizedAuditLogger(serviceName);
}