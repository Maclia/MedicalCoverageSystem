import { redisManager } from '../config/redis';
import { createLogger } from '../config/logger';
import { EventEmitter } from 'events';
import { RedisClientType } from 'redis';

const logger = createLogger();

export interface Message {
  id?: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  delay?: number;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface QueueOptions {
  maxLength?: number;
  maxAge?: number;
  consumerGroup?: string;
  idempotencyWindow?: number; // Time in ms to track processed messages
  deadLetterQueue?: string;
  visibilityTimeout?: number;
}

export interface ConsumerOptions {
  groupName: string;
  consumerName: string;
  batchSize?: number;
  blockTimeout?: number;
  prefetchCount?: number;
  processingTimeout?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLettered: number;
  throughput: number;
}

class MessageQueue extends EventEmitter {
  private client: RedisClientType;
  private queues: Map<string, QueueOptions> = new Map();
  private consumers: Map<string, Set<string>> = new Map();
  private processors: Map<string, Set<(message: Message) => Promise<void>>> = new Map();
  private idempotencyKeys: Map<string, Set<string>> = new Map();
  private isShuttingDown = false;

  constructor() {
    super();
    this.client = redisManager.getClient();
    this.setupGracefulShutdown();
  }

  // Queue management
  async createQueue(name: string, options: QueueOptions = {}): Promise<void> {
    const defaultOptions: QueueOptions = {
      maxLength: 10000,
      maxAge: 86400000, // 24 hours
      consumerGroup: 'default',
      idempotencyWindow: 300000, // 5 minutes
      deadLetterQueue: `${name}.dlq`,
      visibilityTimeout: 30000, // 30 seconds
      ...options
    };

    this.queues.set(name, defaultOptions);
    this.consumers.set(name, new Set());
    this.processors.set(name, new Set());
    this.idempotencyKeys.set(name, new Set());

    try {
      // Create Redis stream
      await this.client.xAdd(name, '*', {
        created: Date.now(),
        type: 'queue_created'
      });

      // Create consumer group if it doesn't exist
      try {
        await this.client.xGroupCreate(name, defaultOptions.consumerGroup, '0', {
          MKSTREAM: true
        });
      } catch (error: any) {
        if (!error.message.includes('BUSYGROUP')) {
          throw error;
        }
      }

      // Create dead letter queue
      if (defaultOptions.deadLetterQueue) {
        try {
          await this.client.xGroupCreate(
            defaultOptions.deadLetterQueue,
            defaultOptions.consumerGroup,
            '0',
            { MKSTREAM: true }
          );
        } catch (error: any) {
          if (!error.message.includes('BUSYGROUP')) {
            throw error;
          }
        }
      }

      logger.info('Queue created successfully', { name, options: defaultOptions });
    } catch (error) {
      logger.error('Failed to create queue', error as Error, { name });
      throw error;
    }
  }

  // Message publishing
  async publish(queueName: string, data: any, options: {
    delay?: number;
    priority?: number;
    maxRetries?: number;
    metadata?: Record<string, any>;
    id?: string;
  } = {}): Promise<string> {
    if (!this.queues.has(queueName)) {
      await this.createQueue(queueName);
    }

    const message: Message = {
      id: options.id,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || 3,
      delay: options.delay,
      priority: options.priority,
      metadata: options.metadata
    };

    try {
      const messageId = await this.client.xAdd(queueName, '*', message);

      logger.info('Message published', {
        queueName,
        messageId,
        type: data.type || 'unknown'
      });

      this.emit('message:published', { queueName, messageId, message });
      return messageId;

    } catch (error) {
      logger.error('Failed to publish message', error as Error, { queueName, message });
      throw error;
    }
  }

  // Batch publishing
  async publishBatch(queueName: string, messages: any[], options: {
    maxRetries?: number;
    delay?: number;
  } = {}): Promise<string[]> {
    const pipeline = this.client.multi();
    const messageIds: string[] = [];

    for (const data of messages) {
      const message: Message = {
        data,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: options.maxRetries || 3,
        delay: options.delay
      };

      messageIds.push(pipeline.xAdd(queueName, '*', message) as any);
    }

    try {
      const results = await pipeline.exec();
      const actualIds = results?.map(([, id]) => id) || [];

      logger.info('Batch messages published', {
        queueName,
        count: messages.length,
        messageIds: actualIds
      });

      return actualIds;
    } catch (error) {
      logger.error('Failed to publish batch messages', error as Error, {
        queueName,
        count: messages.length
      });
      throw error;
    }
  }

  // Consumer registration
  async consume(queueName: string, processor: (message: Message) => Promise<void>, options: ConsumerOptions): Promise<void> {
    if (!this.queues.has(queueName)) {
      await this.createQueue(queueName);
    }

    const { groupName, consumerName } = options;
    const consumerKey = `${groupName}:${consumerName}`;

    this.processors.get(queueName)?.add(processor);
    this.consumers.get(queueName)?.add(consumerKey);

    logger.info('Consumer registered', {
      queueName,
      groupName,
      consumerName
    });

    // Start consuming messages
    this.startConsumer(queueName, processor, options);
  }

  private async startConsumer(queueName: string, processor: (message: Message) => Promise<void>, options: ConsumerOptions): Promise<void> {
    const { groupName, consumerName, batchSize = 1, blockTimeout = 5000, processingTimeout = 30000 } = options;

    while (!this.isShuttingDown) {
      try {
        const results = await this.client.xReadGroup(
          groupName,
          consumerName,
          [
            { key: queueName, id: '>' } // Read new messages
          ],
          {
            COUNT: batchSize,
            BLOCK: blockTimeout
          }
        );

        if (results && results.length > 0) {
          const messages = results[0].messages;
          await this.processMessages(queueName, messages, processor, groupName, consumerName, processingTimeout);
        }
      } catch (error) {
        if (error.message.includes('NOGROUP')) {
          // Consumer group doesn't exist, recreate it
          await this.recreateConsumerGroup(queueName, groupName);
        } else {
          logger.error('Consumer error', error as Error, { queueName, consumerName });
          await this.sleep(1000); // Wait before retrying
        }
      }
    }
  }

  private async processMessages(
    queueName: string,
    messages: any[],
    processor: (message: Message) => Promise<void>,
    groupName: string,
    consumerName: string,
    processingTimeout: number
  ): Promise<void> {
    for (const messageData of messages) {
      const message: Message = {
        id: messageData.id,
        ...messageData.message
      };

      try {
        // Check idempotency
        if (await this.isDuplicateMessage(queueName, message)) {
          await this.acknowledgeMessage(queueName, message.id!, groupName);
          continue;
        }

        // Mark message as processing
        await this.markAsProcessing(queueName, message.id!, groupName);

        // Process message with timeout
        await Promise.race([
          processor(message),
          this.createTimeoutPromise(processingTimeout)
        ]);

        // Acknowledge successful processing
        await this.acknowledgeMessage(queueName, message.id!, groupName);

        this.emit('message:processed', { queueName, messageId: message.id, message });

      } catch (error) {
        await this.handleProcessingError(queueName, message, error as Error, groupName, consumerName);
      }
    }
  }

  private async isDuplicateMessage(queueName: string, message: Message): Promise<boolean> {
    const queueOptions = this.queues.get(queueName);
    if (!queueOptions?.idempotencyWindow) {
      return false;
    }

    const idempotencyKey = `${queueName}:processed:${message.data.id || message.id}`;
    const exists = await this.client.exists(idempotencyKey);

    if (exists) {
      logger.debug('Duplicate message detected', { queueName, messageId: message.id });
      return true;
    }

    // Mark as processed
    await this.client.setEx(idempotencyKey, queueOptions.idempotencyWindow / 1000, '1');
    return false;
  }

  private async handleProcessingError(queueName: string, message: Message, error: Error, groupName: string, consumerName: string): Promise<void> {
    const queueOptions = this.queues.get(queueName);
    const maxRetries = queueOptions?.maxRetries || 3;

    message.retries++;

    logger.error('Message processing failed', error, {
      queueName,
      messageId: message.id,
      retryCount: message.retries,
      maxRetries
    });

    this.emit('message:failed', { queueName, messageId: message.id, message, error });

    if (message.retries >= maxRetries) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(queueName, message);
      await this.acknowledgeMessage(queueName, message.id!, groupName);
    } else {
      // Add delay and retry
      const delay = Math.min(Math.pow(2, message.retries) * 1000, 30000); // Exponential backoff, max 30s
      message.delay = delay;

      await this.publish(queueName + '.retry', message.data, {
        delay,
        maxRetries: maxRetries - message.retries,
        id: message.id
      });

      await this.acknowledgeMessage(queueName, message.id!, groupName);
    }
  }

  private async moveToDeadLetterQueue(queueName: string, message: Message): Promise<void> {
    const queueOptions = this.queues.get(queueName);
    const dlqName = queueOptions?.deadLetterQueue || `${queueName}.dlq`;

    const deadLetterMessage = {
      ...message,
      originalQueue: queueName,
      failedAt: Date.now(),
      lastError: message.metadata?.lastError
    };

    await this.publish(dlqName, deadLetterMessage.data, {
      metadata: deadLetterMessage
    });

    logger.warn('Message moved to dead letter queue', {
      queueName,
      dlqName,
      messageId: message.id
    });

    this.emit('message:dead_lettered', { queueName, dlqName, messageId: message.id, message });
  }

  private async acknowledgeMessage(queueName: string, messageId: string, groupName: string): Promise<void> {
    await this.client.xAck(queueName, groupName, messageId);
  }

  private async markAsProcessing(queueName: string, messageId: string, groupName: string): Promise<void> {
    // This could implement visibility timeout logic
    // For now, just log the processing start
    logger.debug('Message processing started', { queueName, messageId, groupName });
  }

  // Queue management operations
  async getQueueStats(queueName: string): Promise<QueueStats> {
    try {
      const info = await this.client.xInfoStream(queueName);
      const groups = await this.client.xInfoGroups(queueName);

      return {
        pending: parseInt(info['last-generated-id'].split('-')[0]) - info.length,
        processing: groups.reduce((total, group) => total + group.pending, 0),
        completed: info['first-entry'] ? parseInt(info['first-generated-id'].split('-')[0]) : 0,
        failed: 0, // Would need to track this separately
        deadLettered: 0, // Would need to check DLQ
        throughput: 0 // Would need to track metrics
      };
    } catch (error) {
      logger.error('Failed to get queue stats', error as Error, { queueName });
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        deadLettered: 0,
        throughput: 0
      };
    }
  }

  async clearQueue(queueName: string): Promise<void> {
    try {
      await this.client.del(queueName);
      logger.info('Queue cleared', { queueName });
    } catch (error) {
      logger.error('Failed to clear queue', error as Error, { queueName });
      throw error;
    }
  }

  async deleteQueue(queueName: string): Promise<void> {
    try {
      await this.clearQueue(queueName);

      // Clear dead letter queue if it exists
      const queueOptions = this.queues.get(queueName);
      if (queueOptions?.deadLetterQueue) {
        await this.clearQueue(queueOptions.deadLetterQueue);
      }

      this.queues.delete(queueName);
      this.consumers.delete(queueName);
      this.processors.delete(queueName);
      this.idempotencyKeys.delete(queueName);

      logger.info('Queue deleted', { queueName });
    } catch (error) {
      logger.error('Failed to delete queue', error as Error, { queueName });
      throw error;
    }
  }

  private async recreateConsumerGroup(queueName: string, groupName: string): Promise<void> {
    try {
      await this.client.xGroupCreate(queueName, groupName, '0', {
        MKSTREAM: true
      });
      logger.info('Consumer group recreated', { queueName, groupName });
    } catch (error) {
      logger.error('Failed to recreate consumer group', error as Error, { queueName, groupName });
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), timeout);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      this.isShuttingDown = true;
      logger.info('Message queue shutting down gracefully');
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  // Retry queue processing
  async processRetryQueues(): Promise<void> {
    for (const [queueName] of this.queues) {
      const retryQueueName = queueName + '.retry';

      try {
        const messages = await this.client.xRange(retryQueueName, '-', '+');

        for (const [messageId, messageData] of messages) {
          const message = messageData as Message;

          if (message.delay && message.delay > 0) {
            // Check if delay has passed
            const now = Date.now();
            const messageTime = message.timestamp;

            if (now - messageTime >= message.delay) {
              // Move back to main queue
              await this.publish(queueName, message.data, {
                maxRetries: message.maxRetries,
                id: message.id
              });

              // Remove from retry queue
              await this.client.xDel(retryQueueName, messageId);

              logger.debug('Message moved from retry queue', {
                queueName,
                messageId: message.id
              });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to process retry queue', error as Error, { retryQueueName });
      }
    }
  }
}

export const messageQueue = new MessageQueue();
export default messageQueue;