import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

const connectionString = process.env.CORE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('CORE_DB_URL environment variable is required');
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

// Health check for database connection
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};