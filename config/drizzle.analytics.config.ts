import type { Config } from 'drizzle-kit';

export default {
  schema: './services/analytics-service/src/schema.ts',
  out: './services/analytics-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics',
  },
} satisfies Config;
