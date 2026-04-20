import type { Config } from 'drizzle-kit';

export default {
  schema: './services/finance-service/src/models/schema.ts',
  out: './services/finance-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_finance',
  },
} satisfies Config;