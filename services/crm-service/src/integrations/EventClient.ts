import { eventBus, EventFactory, DomainEvent } from '@medical-coverage/shared/message-queue';
import { messageQueue } from '@medical-coverage/shared/message-queue';
import { config } from '../config';
import { createLogger } from '@medical-coverage/shared/message-queue/src/config/logger';

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

  async publishEvent(eventType: string, aggregateId: string | number, data: any, metadata: Record<string, any> = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const event = EventFactory.createEvent({
      type: eventType,
      aggregateId: String(aggregateId),
      aggregateType: 'crm',
      data,
      metadata: {
        service: 'crm-service',
        timestamp: Date.now(),
        ...metadata
      }
    });

    await eventBus.publish(event);
    
    logger.debug('Event published', {
      eventType,
      eventId: event.id,
      aggregateId
    });

    return event.id;
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