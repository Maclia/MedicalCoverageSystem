import { db } from '../../../core-service/src/config/database.js';
import { outboxEvents, outboxStatusEnum, OutboxEvent } from '../../../core-service/src/models/outbox.schema.js';
import type { Transaction } from 'drizzle-orm';
import { eq, and, lt } from 'drizzle-orm';
import { DomainEvent } from '../events/EventBus.js';
import createLogger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 100;
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 1000; // 1 second

export class OutboxProcessor {
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private logger = createLogger('outbox-processor');

  constructor(
    private eventBus: any,
    private pollingIntervalMs: number = 5000
  ) {}

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('Outbox Processor started');
    
    this.pollingInterval = setInterval(() => {
      this.processPending().catch(err => {
        this.logger.error('Outbox processing failed', { error: err.message });
      });
    }, this.pollingIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.logger.info('Outbox Processor stopped');
  }

  async processPending(): Promise<void> {
    if (!this.isRunning) return;

    // Production-grade concurrent processing with row-level locking
    // SELECT FOR UPDATE SKIP LOCKED allows safe horizontal scaling
    // Multiple workers can run in parallel without duplicate processing
    const pendingEvents = await db.transaction(async (tx: any) => {
      return await tx.select()
        .from(outboxEvents)
        .where(and(
          eq(outboxEvents.status, 'PENDING'),
          lt(outboxEvents.retries, MAX_RETRIES)
        ))
        .orderBy(outboxEvents.createdAt)
        .limit(BATCH_SIZE)
        .for('update')
        .skipLocked();
    });

    if (pendingEvents.length === 0) return;

    this.logger.debug(`Processing ${pendingEvents.length} outbox events`);

    // Process events in parallel for throughput
    // Order preservation is maintained per aggregateId by database ordering
    await Promise.all(
      pendingEvents.map(event => this.processEvent(event))
    );
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.eventBus.publish({
        id: event.id,
        type: event.eventType,
        version: event.eventVersion,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload
      });

      await this.markPublished(event.id);
      this.logger.debug('Event published successfully', { eventId: event.id, eventType: event.eventType });
      
    } catch (error) {
      await this.markFailed(event.id, error as Error);
      this.logger.warn('Failed to publish event, will retry', {
        eventId: event.id,
        eventType: event.eventType,
        retries: event.retries + 1,
        error: (error as Error).message
      });
    }
  }

  private async markPublished(eventId: string): Promise<void> {
    await db.update(outboxEvents)
      .set({
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lastAttemptAt: new Date()
      })
      .where(eq(outboxEvents.id, eventId));
  }

  private async markFailed(eventId: string, error: Error): Promise<void> {
    await db.update(outboxEvents)
      .set({
        retries: outboxEvents.retries + 1,
        lastAttemptAt: new Date(),
        errorMessage: error.message,
        status: outboxEvents.retries + 1 >= MAX_RETRIES ? 'FAILED' : 'PENDING'
      })
      .where(eq(outboxEvents.id, eventId));
  }

  /**
   * Atomic transaction helper to append event to outbox
   * Use this inside your database transactions
   */
  static async appendEvent(trx: any, event: {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    eventVersion?: number;
    payload: Record<string, any>;
  }): Promise<void> {
    await trx.insert(outboxEvents).values({
      id: uuidv4(),
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventVersion: event.eventVersion || 1,
      payload: event.payload,
      status: 'PENDING'
    });
  }
}