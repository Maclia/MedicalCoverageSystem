import type { Config } from 'drizzle-kit';

export default {
  schema: './services/wellness-service/src/models/schema.ts',
  out: './services/wellness-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_wellness',
  },
} satisfies Config;