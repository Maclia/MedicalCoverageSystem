import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../../shared/schemas/claims.ts';

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'medical_coverage',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_SIZE || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
});

// Create Drizzle database instance
export const db = drizzle(pool, {
  schema: schema
});

// Health check for database connection
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const result = await db.select().from(schema.claims as any).limit(1);
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};
