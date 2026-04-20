import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from finance-service .env file
dotenv.config({ path: path.join(__dirname, 'services/finance-service/.env') });

export default defineConfig({
  schema: './services/finance-service/src/models/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_finance',
  },
  verbose: true,
  strict: true,
});
