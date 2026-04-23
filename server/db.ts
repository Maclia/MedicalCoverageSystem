import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../services/shared/schemas/schemas/schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Create PostgreSQL connection
const client = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage');

// Initialize Drizzle ORM
export const db = drizzle(client, { schema });
