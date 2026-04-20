import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Logger } from 'pino';

export class DatabaseConnection {
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async connect(): Promise<void> {
    try {
      const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics';

      this.pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.logger.info(`Database connected successfully at ${result.rows[0].now}`);

      // Initialize Drizzle ORM
      this.db = drizzle(this.pool);

      // Set up connection pool event listeners
      this.pool.on('error', (err) => {
        this.logger.error('Unexpected error on idle client', err);
      });

      this.pool.on('connect', () => {
        this.logger.debug('New connection pool established');
      });

      this.pool.on('remove', () => {
        this.logger.debug('Connection removed from pool');
      });
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  getClient(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    }
  }
}
