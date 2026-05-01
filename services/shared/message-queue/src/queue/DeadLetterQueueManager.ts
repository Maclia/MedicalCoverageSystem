import { Pool } from 'pg';
import { createLogger } from '../config/logger.js';
import { messageQueue } from './MessageQueue.js';

const logger = createLogger();

export interface DeadLetterMessage {
  id: string;
  queueName: string;
  originalQueue: string;
  failedAt: Date;
  retries: number;
  lastError: string;
  data: any;
  metadata: any;
  status: 'new' | 'retrying' | 'resolved' | 'archived';
}

export class DeadLetterQueueManager {
  private pool: Pool;
  private initialized = false;

  constructor(connectionConfig: any) {
    this.pool = new Pool(connectionConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS dead_letter_messages (
          id VARCHAR(255) PRIMARY KEY,
          queue_name VARCHAR(255) NOT NULL,
          original_queue VARCHAR(255) NOT NULL,
          failed_at TIMESTAMP NOT NULL,
          retries INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          data JSONB NOT NULL,
          metadata JSONB,
          status VARCHAR(50) NOT NULL DEFAULT 'new',
          resolved_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_dlq_queue_name ON dead_letter_messages(queue_name);
        CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_messages(status);
        CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON dead_letter_messages(failed_at);
      `);

      this.initialized = true;
      logger.info('Dead Letter Queue manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DLQ manager', error as Error);
      throw error;
    }
  }

  async storeFailedMessage(
    messageId: string,
    queueName: string,
    originalQueue: string,
    error: Error,
    data: any,
    metadata?: any
  ): Promise<void> {
    await this.pool.query(`
      INSERT INTO dead_letter_messages (
        id, queue_name, original_queue, failed_at, last_error, data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        retries = dead_letter_messages.retries + 1,
        last_error = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [
      messageId,
      queueName,
      originalQueue,
      new Date(),
      error.message + '\n' + error.stack,
      JSON.stringify(data),
      metadata ? JSON.stringify(metadata) : null
    ]);

    logger.warn('Message stored in DLQ', {
      messageId,
      queueName,
      originalQueue,
      error: error.message
    });
  }

  async getFailedMessages(queueName?: string, limit: number = 100): Promise<DeadLetterMessage[]> {
    let query = 'SELECT * FROM dead_letter_messages WHERE status = $1';
    const params: any[] = ['new'];

    if (queueName) {
      query += ' AND queue_name = $2';
      params.push(queueName);
    }

    query += ' ORDER BY failed_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapRowToMessage);
  }

  async retryMessage(messageId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT * FROM dead_letter_messages WHERE id = $1 AND status = $2',
      [messageId, 'new']
    );

    if (result.rows.length === 0) {
      return false;
    }

    const message = result.rows[0];

    try {
      await messageQueue.publish(message.original_queue, message.data, {
        metadata: {
          ...message.metadata,
          retriedFromDlq: true,
          originalMessageId: messageId
        }
      });

      await this.pool.query(`
        UPDATE dead_letter_messages 
        SET status = $1, retries = retries + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, ['retrying', messageId]);

      logger.info('Message retried from DLQ', { messageId, originalQueue: message.original_queue });
      return true;
    } catch (error) {
      logger.error('Failed to retry DLQ message', error as Error, { messageId });
      return false;
    }
  }

  async resolveMessage(messageId: string): Promise<void> {
    await this.pool.query(`
      UPDATE dead_letter_messages 
      SET status = $1, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, ['resolved', messageId]);

    logger.info('DLQ message marked as resolved', { messageId });
  }

  async archiveOldMessages(retentionDays: number = 90): Promise<number> {
    const result = await this.pool.query(`
      UPDATE dead_letter_messages 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE failed_at < NOW() - INTERVAL '${retentionDays} days'
      AND status = $2
    `, ['archived', 'new']);

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('Archived old DLQ messages', { count, retentionDays });
    }

    return count;
  }

  private mapRowToMessage(row: any): DeadLetterMessage {
    return {
      id: row.id,
      queueName: row.queue_name,
      originalQueue: row.original_queue,
      failedAt: new Date(row.failed_at),
      retries: row.retries,
      lastError: row.last_error,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      status: row.status
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}