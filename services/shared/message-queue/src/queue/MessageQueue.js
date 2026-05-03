import { redisManager } from '../config/redis.js';
import { createLogger } from '../config/logger.js';
import { EventEmitter } from 'events';
const logger = createLogger();
class MessageQueue extends EventEmitter {
    constructor() {
        super();
        this.queues = new Map();
        this.consumers = new Map();
        this.processors = new Map();
        this.idempotencyKeys = new Map();
        this.isShuttingDown = false;
        this.client = redisManager.getClient();
        this.setupGracefulShutdown();
    }
    async connect(options) {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
        logger.info('Message queue connected successfully');
    }
    async disconnect() {
        this.isShuttingDown = true;
        if (this.client.isOpen) {
            await this.client.quit();
        }
        logger.info('Message queue disconnected successfully');
    }
    serializeMessage(message) {
        return Object.fromEntries(Object.entries(message).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
        ]));
    }
    // Queue management
    async createQueue(name, options = {}) {
        const defaultOptions = {
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
                created: Date.now().toString(),
                type: 'queue_created'
            });
            // Create consumer group if it doesn't exist
            try {
                await this.client.xGroupCreate(name, defaultOptions.consumerGroup, '0', {
                    MKSTREAM: true
                });
            }
            catch (error) {
                if (!error.message.includes('BUSYGROUP')) {
                    throw error;
                }
            }
            // Create dead letter queue
            if (defaultOptions.deadLetterQueue) {
                try {
                    await this.client.xGroupCreate(defaultOptions.deadLetterQueue, defaultOptions.consumerGroup, '0', { MKSTREAM: true });
                }
                catch (error) {
                    if (!error.message.includes('BUSYGROUP')) {
                        throw error;
                    }
                }
            }
            logger.info('Queue created successfully', { name, options: defaultOptions });
        }
        catch (error) {
            logger.error('Failed to create queue', error, { name });
            throw error;
        }
    }
    // Message publishing
    async publish(queueName, data, options = {}) {
        if (!this.queues.has(queueName)) {
            await this.createQueue(queueName);
        }
        const message = {
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
            const messageId = await this.client.xAdd(queueName, '*', this.serializeMessage(message));
            logger.info('Message published', {
                queueName,
                messageId,
                type: data.type || 'unknown'
            });
            this.emit('message:published', { queueName, messageId, message });
            return messageId;
        }
        catch (error) {
            logger.error('Failed to publish message', error, { queueName, message });
            throw error;
        }
    }
    // Batch publishing
    async publishBatch(queueName, messages, options = {}) {
        const pipeline = this.client.multi();
        const messageIds = [];
        for (const data of messages) {
            const message = {
                data,
                timestamp: Date.now(),
                retries: 0,
                maxRetries: options.maxRetries || 3,
                delay: options.delay
            };
            messageIds.push(pipeline.xAdd(queueName, '*', this.serializeMessage(message)));
        }
        try {
            const results = await pipeline.exec();
            const actualIds = results ? results.map(([, id]) => id) : [];
            logger.info('Batch messages published', {
                queueName,
                count: messages.length,
                messageIds: actualIds
            });
            return actualIds;
        }
        catch (error) {
            logger.error('Failed to publish batch messages', error, {
                queueName,
                count: messages.length
            });
            throw error;
        }
    }
    // Consumer registration
    async consume(queueName, processor, options) {
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
    async startConsumer(queueName, processor, options) {
        const { groupName, consumerName, batchSize = 1, blockTimeout = 5000, processingTimeout = 30000 } = options;
        while (!this.isShuttingDown) {
            try {
                const results = await this.client.xReadGroup(groupName, consumerName, [
                    { key: queueName, id: '>' } // Read new messages
                ], {
                    COUNT: batchSize,
                    BLOCK: blockTimeout
                });
                if (results && results.length > 0) {
                    const messages = results[0].messages;
                    await this.processMessages(queueName, messages, processor, groupName, consumerName, processingTimeout);
                }
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('NOGROUP')) {
                    // Consumer group doesn't exist, recreate it
                    await this.recreateConsumerGroup(queueName, groupName);
                }
                else {
                    logger.error('Consumer error', error, { queueName, consumerName });
                    await this.sleep(1000); // Wait before retrying
                }
            }
        }
    }
    async processMessages(queueName, messages, processor, groupName, consumerName, processingTimeout) {
        for (const messageData of messages) {
            const message = {
                id: messageData.id,
                ...messageData.message
            };
            try {
                // Check idempotency
                if (await this.isDuplicateMessage(queueName, message)) {
                    await this.acknowledgeMessage(queueName, message.id, groupName);
                    continue;
                }
                // Mark message as processing
                await this.markAsProcessing(queueName, message.id, groupName);
                // Process message with timeout
                await Promise.race([
                    processor(message),
                    this.createTimeoutPromise(processingTimeout)
                ]);
                // Acknowledge successful processing
                await this.acknowledgeMessage(queueName, message.id, groupName);
                this.emit('message:processed', { queueName, messageId: message.id, message });
            }
            catch (error) {
                await this.handleProcessingError(queueName, message, error, groupName, consumerName);
            }
        }
    }
    async isDuplicateMessage(queueName, message) {
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
    async handleProcessingError(queueName, message, error, groupName, consumerName) {
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
            await this.acknowledgeMessage(queueName, message.id, groupName);
        }
        else {
            // Add delay and retry
            const delay = Math.min(Math.pow(2, message.retries) * 1000, 30000); // Exponential backoff, max 30s
            message.delay = delay;
            await this.publish(queueName + '.retry', message.data, {
                delay,
                maxRetries: maxRetries - message.retries,
                id: message.id
            });
            await this.acknowledgeMessage(queueName, message.id, groupName);
        }
    }
    async moveToDeadLetterQueue(queueName, message) {
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
    async acknowledgeMessage(queueName, messageId, groupName) {
        await this.client.xAck(queueName, groupName, messageId);
    }
    async markAsProcessing(queueName, messageId, groupName) {
        // This could implement visibility timeout logic
        // For now, just log the processing start
        logger.debug('Message processing started', { queueName, messageId, groupName });
    }
    // Queue management operations
    async getQueueStats(queueName) {
        try {
            const info = await this.client.xInfoStream(queueName);
            const groups = await this.client.xInfoGroups(queueName);
            return {
                pending: parseInt(info.lastGeneratedId.split('-')[0]) - info.length,
                processing: groups.reduce((total, group) => total + group.pending, 0),
                completed: info.firstEntry ? parseInt(info.lastGeneratedId.split('-')[0]) : 0,
                failed: 0, // Would need to track this separately
                deadLettered: 0, // Would need to check DLQ
                throughput: 0 // Would need to track metrics
            };
        }
        catch (error) {
            logger.error('Failed to get queue stats', error, { queueName });
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
    async clearQueue(queueName) {
        try {
            await this.client.del(queueName);
            logger.info('Queue cleared', { queueName });
        }
        catch (error) {
            logger.error('Failed to clear queue', error, { queueName });
            throw error;
        }
    }
    async deleteQueue(queueName) {
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
        }
        catch (error) {
            logger.error('Failed to delete queue', error, { queueName });
            throw error;
        }
    }
    async recreateConsumerGroup(queueName, groupName) {
        try {
            await this.client.xGroupCreate(queueName, groupName, '0', {
                MKSTREAM: true
            });
            logger.info('Consumer group recreated', { queueName, groupName });
        }
        catch (error) {
            logger.error('Failed to recreate consumer group', error, { queueName, groupName });
        }
    }
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Processing timeout')), timeout);
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    setupGracefulShutdown() {
        const shutdown = () => {
            this.isShuttingDown = true;
            logger.info('Message queue shutting down gracefully');
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    // Retry queue processing
    async processRetryQueues() {
        for (const [queueName] of this.queues) {
            const retryQueueName = queueName + '.retry';
            try {
                const messages = await this.client.xRange(retryQueueName, '-', '+');
                for (const entry of messages) {
                    const messageId = entry.id;
                    const messageData = entry.message;
                    const message = messageData;
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
            }
            catch (error) {
                logger.error('Failed to process retry queue', error, { retryQueueName });
            }
        }
    }
}
export const messageQueue = new MessageQueue();
export default messageQueue;
