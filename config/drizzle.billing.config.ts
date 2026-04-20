import type { Config } from 'drizzle-kit';

export default {
  schema: './services/billing-service/src/models/schema.ts',
  out: './services/billing-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_billing',
  },
} satisfies Config;