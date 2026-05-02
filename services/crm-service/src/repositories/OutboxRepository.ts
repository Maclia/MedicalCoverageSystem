import { db } from '../models/Database';
import { crmOutbox } from '../models/schema';
import { eq, and, lt, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export enum OutboxStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER'
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
  status: OutboxStatus;
  createdAt: Date;
  publishedAt?: Date;
  failedAttempts: number;
  lastError?: string;
}

export class OutboxRepository {
  private readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Create new event in outbox (call this inside database transaction)
   */
  async create(event: Omit<OutboxEvent, 'id' | 'status' | 'createdAt' | 'failedAttempts'>): Promise<string> {
    const eventId = uuidv4();
    
    await db.insert(crmOutbox).values({
      id: eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      data: event.data,
      metadata: {
        service: 'crm-service',
        timestamp: Date.now(),
        ...event.metadata
      },
      status: OutboxStatus.PENDING,
      createdAt: new Date(),
      failedAttempts: 0
    });

    return eventId;
  }

  /**
   * Get pending events for processing
   */
  async getPendingEvents(limit: number = 50): Promise<OutboxEvent[]> {
    return db.select()
      .from(crmOutbox)
      .where(
        and(
          eq(crmOutbox.status, OutboxStatus.PENDING),
          lt(crmOutbox.failedAttempts, this.MAX_RETRY_ATTEMPTS)
        )
      )
      .orderBy(asc(crmOutbox.createdAt))
      .limit(limit);
  }

  /**
   * Mark event as published
   */
  async markAsPublished(eventId: string): Promise<void> {
    await db.update(crmOutbox)
      .set({
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date()
      })
      .where(eq(crmOutbox.id, eventId));
  }

  /**
   * Mark event as failed
   */
  async markAsFailed(eventId: string, error: string): Promise<void> {
    await db.update(crmOutbox)
      .set({
        status: OutboxStatus.FAILED,
        failedAttempts: (crmOutbox.failedAttempts as any) + 1,
        lastError: error
      })
      .where(eq(crmOutbox.id, eventId));
  }

  /**
   * Reset failed events for retry
   */
  async resetFailedEvents(): Promise<number> {
    const result = await db.update(crmOutbox)
      .set({ status: OutboxStatus.PENDING })
      .where(
        and(
          eq(crmOutbox.status, OutboxStatus.FAILED),
          lt(crmOutbox.failedAttempts, this.MAX_RETRY_ATTEMPTS)
        )
      );

    return result.rowCount ?? 0;
  }

  /**
   * Get outbox metrics for monitoring
   */
  async getMetrics() {
    const pending = await db.$count(crmOutbox, eq(crmOutbox.status, OutboxStatus.PENDING));
    const published = await db.$count(crmOutbox, eq(crmOutbox.status, OutboxStatus.PUBLISHED));
    const failed = await db.$count(crmOutbox, eq(crmOutbox.status, OutboxStatus.FAILED));

    return {
      pending,
      published,
      failed,
      maxRetryAttempts: this.MAX_RETRY_ATTEMPTS
    };
  }
}

export const outboxRepository = new OutboxRepository();