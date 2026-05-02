import { outboxRepository } from '../repositories/OutboxRepository';
import { EventBus } from '../../../shared/message-queue/src/events/EventBus';
import createLogger from '../../../shared/message-queue/src/config/logger';

const BATCH_SIZE = 50;
const POLLING_INTERVAL = 5000; // 5 seconds

export class OutboxProcessorWorker {
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private logger = createLogger('crm-outbox-processor');
  private eventBus = EventBus.getInstance();

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('✅ CRM Outbox Processor started');
    
    this.pollingInterval = setInterval(() => {
      this.processPending().catch(err => {
        this.logger.error('Outbox processing failed', { error: err.message });
      });
    }, POLLING_INTERVAL);
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.logger.info('CRM Outbox Processor stopped');
  }

  async processPending(): Promise<void> {
    if (!this.isRunning) return;

    const pendingEvents = await outboxRepository.getPendingEvents(BATCH_SIZE);

    if (pendingEvents.length === 0) return;

    this.logger.debug(`Processing ${pendingEvents.length} CRM outbox events`);

    await Promise.all(
      pendingEvents.map(event => this.processEvent(event))
    );
  }

  private async processEvent(event: any): Promise<void> {
    try {
      await this.eventBus.publish({
        id: event.id,
        type: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        data: event.data,
        metadata: event.metadata
      });

      await outboxRepository.markAsPublished(event.id);
      this.logger.debug('Event published successfully', { 
        eventId: event.id, 
        eventType: event.eventType 
      });
      
    } catch (error) {
      await outboxRepository.markAsFailed(event.id, (error as Error).message);
      this.logger.warn('Failed to publish event, will retry', {
        eventId: event.id,
        eventType: event.eventType,
        failedAttempts: event.failedAttempts + 1,
        error: (error as Error).message
      });
    }
  }

  async getMetrics() {
    return outboxRepository.getMetrics();
  }
}

export const outboxProcessor = new OutboxProcessorWorker();