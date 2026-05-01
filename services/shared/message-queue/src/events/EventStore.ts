import { Pool } from 'pg';
import { createLogger } from '../config/logger.js';
import { DomainEvent } from './EventBus.js';

const logger = createLogger();

export interface StoredEvent extends DomainEvent {
  sequence: number;
  stored_at: Date;
}

export class EventStore {
  private pool: Pool;
  private initialized = false;

  constructor(connectionConfig: any) {
    this.pool = new Pool(connectionConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS event_store (
          sequence BIGSERIAL PRIMARY KEY,
          event_id UUID UNIQUE NOT NULL,
          type VARCHAR(255) NOT NULL,
          aggregate_id VARCHAR(255) NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB,
          correlation_id UUID,
          causation_id UUID,
          timestamp TIMESTAMP NOT NULL,
          stored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_events_aggregate ON event_store(aggregate_id, aggregate_type, version);
        CREATE INDEX IF NOT EXISTS idx_events_type ON event_store(type);
        CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON event_store(correlation_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON event_store(timestamp);

        -- Ensure optimistic concurrency
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_aggregate_version 
        ON event_store(aggregate_id, aggregate_type, version);
      `);

      this.initialized = true;
      logger.info('Event store initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize event store', error as Error);
      throw error;
    }
  }

  async append(event: DomainEvent): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO event_store (
        event_id, type, aggregate_id, aggregate_type, version, data, 
        metadata, correlation_id, causation_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING sequence
    `, [
      event.id,
      event.type,
      event.aggregateId,
      event.aggregateType,
      event.metadata.version,
      JSON.stringify(event.data),
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.metadata.correlationId,
      event.metadata.causationId,
      new Date(event.metadata.timestamp)
    ]);

    return result.rows[0].sequence;
  }

  async appendBatch(events: DomainEvent[]): Promise<number[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sequences: number[] = [];
      
      for (const event of events) {
        const result = await client.query(`
          INSERT INTO event_store (
            event_id, type, aggregate_id, aggregate_type, version, data, 
            metadata, correlation_id, causation_id, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING sequence
        `, [
          event.id,
          event.type,
          event.aggregateId,
          event.aggregateType,
          event.metadata.version,
          JSON.stringify(event.data),
          event.metadata ? JSON.stringify(event.metadata) : null,
          event.metadata.correlationId,
          event.metadata.causationId,
          new Date(event.metadata.timestamp)
        ]);
        
        sequences.push(result.rows[0].sequence);
      }
      
      await client.query('COMMIT');
      return sequences;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEventsForAggregate(aggregateId: string, aggregateType: string): Promise<StoredEvent[]> {
    const result = await this.pool.query(`
      SELECT * FROM event_store 
      WHERE aggregate_id = $1 AND aggregate_type = $2
      ORDER BY version ASC
    `, [aggregateId, aggregateType]);

    return result.rows.map(this.mapRowToEvent);
  }

  async getEventsByCorrelationId(correlationId: string): Promise<StoredEvent[]> {
    const result = await this.pool.query(`
      SELECT * FROM event_store 
      WHERE correlation_id = $1
      ORDER BY timestamp ASC
    `, [correlationId]);

    return result.rows.map(this.mapRowToEvent);
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<StoredEvent[]> {
    const result = await this.pool.query(`
      SELECT * FROM event_store 
      WHERE type = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [eventType, limit]);

    return result.rows.map(this.mapRowToEvent);
  }

  async getEventsAfterSequence(sequence: number, limit: number = 1000): Promise<StoredEvent[]> {
    const result = await this.pool.query(`
      SELECT * FROM event_store 
      WHERE sequence > $1
      ORDER BY sequence ASC
      LIMIT $2
    `, [sequence, limit]);

    return result.rows.map(this.mapRowToEvent);
  }

  private mapRowToEvent(row: any): StoredEvent {
    const metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {};
    
    return {
      id: row.event_id,
      type: row.type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      metadata: {
        ...metadata,
        version: row.version,
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        timestamp: new Date(row.timestamp).getTime()
      },
      sequence: row.sequence,
      stored_at: new Date(row.stored_at)
    } as unknown as StoredEvent;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}