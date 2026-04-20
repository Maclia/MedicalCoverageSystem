import type { Config } from 'drizzle-kit';

export default {
  schema: './services/analytics-service/src/schema.ts',
  out: './services/analytics-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics',
  },
} satisfies Config;
