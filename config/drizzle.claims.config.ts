import type { Config } from 'drizzle-kit';

export default {
  schema: './services/claims-service/src/models/schema.ts',
  out: './services/claims-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_claims',
  },
} satisfies Config;