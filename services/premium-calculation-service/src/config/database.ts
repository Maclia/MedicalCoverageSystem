/**
 * Database configuration for Premium Calculation Service
 * STANDARD IMPLEMENTATION - MATCHES ALL OTHER SERVICES
 * Uses postgres-js + Drizzle ORM pattern
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

const connectionString = process.env.PREMIUM_CALCULATION_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('PREMIUM_CALCULATION_DB_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: 25,
  idle_timeout: 20,
  connect_timeout: 10,
  statement_timeout: 30000,
  tcp_keepalives_idle: 60,
  prepare: true
} as any);

export const db = drizzle(client, { schema });
export const rawDb = client; // Raw postgres-js client for raw SQL queries
export { schema };

/**
 * Health check for database connection
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await client`SELECT 1`;
    logger.debug('✅ Database connection verified');
    return true;
  } catch (error) {
    logger.error('❌ Database connection check failed:', { error });
    return false;
  }
};

/**
 * Gracefully close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  logger.info('Closing PostgreSQL database connections');
  await client.end();
  logger.info('✅ PostgreSQL connection closed');
};

export default {
  db,
  rawDb,
  schema,
  checkDatabaseConnection,
  closeDatabase
};