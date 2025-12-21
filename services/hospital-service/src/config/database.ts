import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../../shared/schema';

const connectionString = process.env.HOSPITAL_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('HOSPITAL_DB_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };