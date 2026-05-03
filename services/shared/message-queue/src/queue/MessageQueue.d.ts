import { EventEmitter } from 'events';
export interface Message extends Record<string, string | number | any> {
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
    idempotencyWindow?: number;
    deadLetterQueue?: string;
    visibilityTimeout?: number;
    maxRetries?: number;
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
declare class MessageQueue extends EventEmitter {
    private client;
    private queues;
    private consumers;
    private processors;
    private idempotencyKeys;
    private isShuttingDown;
    constructor();
    connect(options: {
        host: string;
        port: number;
        password?: string;
    }): Promise<void>;
    disconnect(): Promise<void>;
    private serializeMessage;
    createQueue(name: string, options?: QueueOptions): Promise<void>;
    publish(queueName: string, data: any, options?: {
        delay?: number;
        priority?: number;
        maxRetries?: number;
        metadata?: Record<string, any>;
        id?: string;
    }): Promise<string>;
    publishBatch(queueName: string, messages: any[], options?: {
        maxRetries?: number;
        delay?: number;
    }): Promise<string[]>;
    consume(queueName: string, processor: (message: Message) => Promise<void>, options: ConsumerOptions): Promise<void>;
    private startConsumer;
    private processMessages;
    private isDuplicateMessage;
    private handleProcessingError;
    private moveToDeadLetterQueue;
    private acknowledgeMessage;
    private markAsProcessing;
    getQueueStats(queueName: string): Promise<QueueStats>;
    clearQueue(queueName: string): Promise<void>;
    deleteQueue(queueName: string): Promise<void>;
    private recreateConsumerGroup;
    private createTimeoutPromise;
    private sleep;
    private setupGracefulShutdown;
    processRetryQueues(): Promise<void>;
}
export declare const messageQueue: MessageQueue;
export default messageQueue;
