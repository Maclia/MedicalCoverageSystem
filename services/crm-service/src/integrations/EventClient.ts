import { EventFactory, DomainEvent } from '@medical-coverage/shared/message-queue';
import { messageQueue } from '@medical-coverage/shared/message-queue';
import { eventBus } from '../../../shared/message-queue/src/events/EventBus';
import { outboxRepository } from '../repositories/OutboxRepository';
import { config } from '../config';
import createLogger from '../../../shared/message-queue/src/config/logger';

const logger = createLogger('crm-event-client');

class EventClient {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize message queue connection
      await messageQueue.connect({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password
      });

      logger.info('Event client initialized successfully');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize event client', error as Error);
      throw error;
    }
  }

  /**
   * Outbox Pattern Implementation:
   * Write event to local database transactionally instead of publishing directly
   * Events are asynchronously published by OutboxProcessor worker
   * 
   * This guarantees atomicity: database commit AND event delivery
   * Eliminates dual writes anti-pattern
   */
  async publishEvent(eventType: string, aggregateId: string | number, data: any, metadata: Record<string, any> = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const eventId = await outboxRepository.create({
      eventType,
      aggregateId: String(aggregateId),
      aggregateType: 'crm',
      data,
      metadata: {
        service: 'crm-service',
        timestamp: Date.now(),
        ...metadata
      }
    });
    
    logger.debug('Event written to outbox table (will be published asynchronously)', {
      eventType,
      eventId,
      aggregateId
    });

    return eventId;
  }

  async subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await eventBus.subscribe(eventType, handler);
  }

  async shutdown(): Promise<void> {
    await messageQueue.disconnect();
    this.initialized = false;
    logger.info('Event client shutdown completed');
  }
}

export const eventClient = new EventClient();
export default eventClient;