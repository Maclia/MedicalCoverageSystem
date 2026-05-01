import { Pool } from 'pg';
import { Saga } from './SagaOrchestrator.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger();

export interface DatabaseSagaRow {
  id: string;
  name: string;
  correlation_id: string;
  status: string;
  current_step: number;
  steps: string | object;
  data: string | object;
  error?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  completed_at?: Date | string | null;
  version: number;
}

export class SagaStateRepository {
  private pool: Pool;
  private initialized = false;

  constructor(connectionConfig: any) {
    this.pool = new Pool(connectionConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create sagas table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS saga_states (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          correlation_id UUID NOT NULL,
          status VARCHAR(50) NOT NULL,
          current_step INTEGER NOT NULL DEFAULT 0,
          steps JSONB NOT NULL,
          data JSONB NOT NULL,
          error TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          version INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_sagas_correlation_id ON saga_states(correlation_id);
        CREATE INDEX IF NOT EXISTS idx_sagas_status ON saga_states(status);
        CREATE INDEX IF NOT EXISTS idx_sagas_updated_at ON saga_states(updated_at);
      `);

      this.initialized = true;
      logger.info('Saga state repository initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize saga state repository', error as Error);
      throw error;
    }
  }

  async saveSaga(saga: Saga): Promise<void> {
    const query = `
      INSERT INTO saga_states (
        id, name, correlation_id, status, current_step, steps, data, error,
        created_at, updated_at, completed_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
      ON CONFLICT (id) DO UPDATE SET
        status = $4,
        current_step = $5,
        steps = $6,
        data = $7,
        error = $8,
        updated_at = $10,
        completed_at = $11,
        version = saga_states.version + 1
    `;

    const values = [
      saga.id,
      saga.name,
      saga.correlationId,
      saga.status,
      saga.currentStep,
      JSON.stringify(saga.steps),
      JSON.stringify(saga.data),
      saga.error ? JSON.stringify(saga.error) : null,
      saga.createdAt,
      saga.updatedAt,
      saga.completedAt
    ];

    await this.pool.query(query, values);
  }

  async getSaga(sagaId: string): Promise<Saga | null> {
    const result = await this.pool.query(
      'SELECT * FROM saga_states WHERE id = $1',
      [sagaId]
    );

    if (result.rows.length === 0) return null;

    return this.mapRowToSaga(result.rows[0]);
  }

  async getSagasByStatus(status: Saga['status']): Promise<Saga[]> {
    const result = await this.pool.query(
      'SELECT * FROM saga_states WHERE status = $1',
      [status]
    );

    return result.rows.map(this.mapRowToSaga);
  }

  async getSagasByCorrelation(correlationId: string): Promise<Saga[]> {
    const result = await this.pool.query(
      'SELECT * FROM saga_states WHERE correlation_id = $1',
      [correlationId]
    );

    return result.rows.map(this.mapRowToSaga);
  }

  async getPendingSagas(): Promise<Saga[]> {
    const result = await this.pool.query(`
      SELECT * FROM saga_states 
      WHERE status IN ('pending', 'running', 'failed')
      AND updated_at > NOW() - INTERVAL '7 days'
    `);

    return result.rows.map(this.mapRowToSaga);
  }

  async deleteSaga(sagaId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM saga_states WHERE id = $1',
      [sagaId]
    );
  }

  async cleanupOldSagas(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const result = await this.pool.query(`
      DELETE FROM saga_states 
      WHERE updated_at < NOW() - INTERVAL '${maxAgeMs} milliseconds'
    `);

    return result.rowCount || 0;
  }

  private mapRowToSaga(row: DatabaseSagaRow): Saga {
    return {
      id: row.id,
      name: row.name,
      correlationId: row.correlation_id,
      status: row.status as Saga['status'],
      currentStep: row.current_step,
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      error: row.error ? JSON.parse(row.error) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}