import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './index';
import { createLogger } from '../utils/logger';

const logger = createLogger();

// Create PostgreSQL connection
const connectionString = config.database.url;
const client = postgres(connectionString, {
  max: config.database.pool.max,
  min: config.database.pool.min,
  idle_timeout: config.database.pool.idleTimeoutMillis,
  connect_timeout: config.database.pool.connectionTimeoutMillis,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  onnotice: (notice) => {
    logger.debug('PostgreSQL notice', {
      message: notice.message,
      severity: notice.severity,
      code: notice.code
    });
  },
  onparameter: (key, value) => {
    logger.debug('PostgreSQL parameter changed', { key, value });
  }
});

// Create Drizzle ORM instance
export const db = drizzle(client, {
  logger: config.server.environment === 'development' ? {
    logQuery: (query, params) => {
      logger.debug('Database query', {
        query: query.replace(/\s+/g, ' ').trim(),
        params: params?.length ? JSON.stringify(params) : undefined
      });
    }
  } : false
});

// Database connection test function
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await client`SELECT 1 as test`;
    return result.length > 0;
  } catch (error) {
    logger.error('Database connection test failed', error as Error);
    return false;
  }
};

// Graceful shutdown function
export const closeConnection = async (): Promise<void> => {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error as Error);
  }
};

// Health check function
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {
    const result = await client`SELECT version() as version, current_timestamp as timestamp`;
    const latency = Date.now() - startTime;

    if (result.length > 0) {
      return {
        status: 'healthy',
        latency
      };
    } else {
      return {
        status: 'unhealthy',
        error: 'No response from database'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
};

// Database migration helper
export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running database migrations...');

    // Check if migrations table exists
    const migrationsTable = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migrations'
      ) as exists
    `;

    if (!migrationsTable[0]?.exists) {
      await client`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      logger.info('Created migrations table');
    }

    // Import and run actual migrations here
    // This would typically use a migration tool like Drizzle Kit

    logger.info('Database migrations completed');
  } catch (error) {
    logger.error('Database migrations failed', error as Error);
    throw error;
  }
};

export default db;