import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schemas/schemes.js';

const connectionString = process.env.INSURANCE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('INSURANCE_DB_URL environment variable is required');
}

// @ts-nocheck - Postgres.js runtime options
const client = postgres(connectionString, {
  max: 25,
  idle_timeout: 20,
  connect_timeout: 10,
  statement_timeout: 30000,
  tcp_keepalives_idle: 60,
  prepare: true
} as any);

export const db = drizzle(client, { schema });
export { schema };