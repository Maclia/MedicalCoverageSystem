import { Pool } from 'pg';
import { createLogger } from '../config/logger.js';

const logger = createLogger();

export class IdempotencyRepository {
  private pool: Pool;
  private initialized = false;

  constructor(connectionConfig: any) {
    this.pool = new Pool(connectionConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key VARCHAR(512) PRIMARY KEY,
          queue_name VARCHAR(255) NOT NULL,
          message_id VARCHAR(255) NOT NULL,
          processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_idempotency_queue_name ON idempotency_keys(queue_name);
        CREATE INDEX IF NOT EXISTS idx_idempotency_processed_at ON idempotency_keys(processed_at);
      `);

      this.initialized = true;
      logger.info('Idempotency repository initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize idempotency repository', error as Error);
      throw error;
    }
  }

  async markProcessed(key: string, queueName: string, messageId: string, metadata?: any): Promise<void> {
    await this.pool.query(`
      INSERT INTO idempotency_keys (key, queue_name, message_id, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO NOTHING
    `, [key, queueName, messageId, metadata ? JSON.stringify(metadata) : null]);
  }

  async isProcessed(key: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM idempotency_keys WHERE key = $1',
      [key]
    );

    return result.rows.length > 0;
  }

  async cleanupOldKeys(retentionDays: number = 30): Promise<number> {
    const result = await this.pool.query(`
      DELETE FROM idempotency_keys 
      WHERE processed_at < NOW() - INTERVAL '${retentionDays} days'
    `);

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('Cleaned up old idempotency keys', { count, retentionDays });
    }

    return count;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}