import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Create a database connection
const connectionString = process.env.DATABASE_URL;
let dbInstance = null;

if (connectionString) {
  try {
    const sql = neon(connectionString!);
    dbInstance = drizzle(sql);
    console.log('Connected to Neon PostgreSQL database');
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
}

export const db = dbInstance;